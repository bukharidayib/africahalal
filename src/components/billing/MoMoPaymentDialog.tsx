import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, CheckCircle2, AlertTriangle, CreditCard, Smartphone, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Extracts a human-readable error message from a supabase.functions.invoke error.
 * The SDK wraps non-2xx responses in FunctionsHttpError with a generic message
 * like "Edge Function returned a non-2xx status code". The real error from the
 * edge function (and upstream proxy/ZynlePay) lives in err.context (a Response).
 */
async function extractFunctionError(err: any, fallback: string): Promise<string> {
  try {
    const ctx = err?.context;
    if (ctx && typeof ctx.json === "function") {
      // Clone so we can fall back to text() if json() fails
      const cloned = typeof ctx.clone === "function" ? ctx.clone() : null;
      try {
        const body = await ctx.json();
        const msg =
          body?.error?.message ||
          body?.error ||
          body?.message ||
          body?.details ||
          (typeof body === "string" ? body : null);
        if (msg) return typeof msg === "string" ? msg : JSON.stringify(msg);
      } catch {
        if (cloned) {
          try {
            const text = await cloned.text();
            if (text) return text.slice(0, 500);
          } catch {
            /* ignore */
          }
        }
      }
    }
    if (err?.message && err.message !== "Edge Function returned a non-2xx status code") {
      return err.message;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

interface MoMoPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  onPaymentComplete?: () => void;
}

type PaymentState = "idle" | "processing" | "pending" | "success" | "error";

const PROVIDERS = [
  { value: "airtel", label: "Airtel Money" },
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "zamtel", label: "Zamtel Kwacha" },
];

export function MoMoPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  onPaymentComplete,
}: MoMoPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [channel, setChannel] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("");
  const [cardExpiryYear, setCardExpiryYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [pollSeconds, setPollSeconds] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number | null>(null);
  const POLL_TIMEOUT_MS = 120_000;

  const { toast } = useToast();

  const phoneRegex = /^0[79]\d{8}$/;
  const isPhoneValid = phoneRegex.test(phoneNumber);
  const isCardValid = cardNumber.replace(/\s/g, "").length >= 13 && cardExpiryMonth.length === 2 && cardExpiryYear.length >= 2 && cardCvv.length >= 3;
  const isFormValid = paymentMethod === "momo"
    ? (isPhoneValid && channel !== "")
    : isCardValid;

  const handlePayment = async () => {
    if (!isFormValid) return;


    setPaymentState("processing");
    setMessage("");

    try {
      const paymentBody = paymentMethod === "card"
        ? {
            invoice_id: invoiceId,
            payment_method: "card",
            card_number: cardNumber.replace(/\s/g, ""),
            expiry_month: cardExpiryMonth,
            expiry_year: cardExpiryYear,
            cvv: cardCvv,
          }
        : { invoice_id: invoiceId, phone_number: phoneNumber, channel };

      const { data, error } = await supabase.functions.invoke("process-momo-payment", {
        body: paymentBody,
      });

      if (error) {
        const realMsg = await extractFunctionError(error, "Payment failed. Please try again.");
        throw new Error(realMsg);
      }

      setMessage(data.message);
      setReference(data.reference || "");
      setTransactionId(data.transaction_id);

      if (data.status === "pending" || data.status === "completed") {
        setPaymentState("pending");
      } else {
        setPaymentState("error");
      }
    } catch (err: any) {
      setPaymentState("error");
      const description = err?.message || "Payment failed. Please try again.";
      setMessage(description);
      toast({ variant: "destructive", title: "Payment Error", description });
    }
  };


  const handleCheckStatus = async () => {
    if (!transactionId || isCheckingStatus) return;

    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-payment-status", {
        body: { transaction_id: transactionId },
      });

      if (error) {
        const realMsg = await extractFunctionError(error, "Could not check payment status.");
        throw new Error(realMsg);
      }

      setMessage(data.message);
      if (data.status === "completed") {
        setPaymentState("success");
        onPaymentComplete?.();
      } else if (data.status === "failed") {
        setPaymentState("error");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Status check failed" });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Auto-poll status every 5s while pending, with 2-min timeout
  useEffect(() => {
    if (paymentState !== "pending" || !transactionId) return;

    pollStartRef.current = Date.now();
    setPollSeconds(0);

    pollIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (pollStartRef.current ?? Date.now())) / 1000);
      setPollSeconds(elapsed);

      if (elapsed * 1000 >= POLL_TIMEOUT_MS) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setPaymentState("error");
        setMessage("Payment status check timed out. Please verify the payment manually or contact support.");
        return;
      }

      handleCheckStatus();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentState, transactionId]);

  const handleClose = () => {
    if (paymentState !== "processing") {
      setPaymentState("idle");
      setPaymentMethod("momo");
      setPhoneNumber("");
      setChannel("");
      setCardNumber("");
      setCardExpiryMonth("");
      setCardExpiryYear("");
      setCardCvv("");
      setMessage("");
      setReference("");
      setTransactionId(null);
      onOpenChange(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${text} copied to clipboard.` });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Make Payment</DialogTitle>
          <DialogDescription>
            Invoice {invoiceNumber} — {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        {paymentState === "idle" && (
          <div className="space-y-4 py-2">
            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("momo")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border-2 p-3 text-xs font-semibold transition-all ${
                  paymentMethod === "momo"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile Money
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border-2 p-3 text-xs font-semibold transition-all ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Bank Card
              </button>
            </div>

            {/* Mobile Money Form */}
            {paymentMethod === "momo" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="provider">Payment Provider</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Money Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="09xxxxxxxx or 07xxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                  {phoneNumber.length > 0 && !isPhoneValid && (
                    <p className="text-xs text-destructive">Enter a valid Zambian mobile number (10 digits starting with 09 or 07)</p>
                  )}
                </div>
              </>
            )}

            {/* Card Payment Form */}
            {paymentMethod === "card" && (
              <>
                <div className="space-y-2">
                  <Label>Card Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                        setCardNumber(val.replace(/(.{4})/g, "$1 ").trim());
                      }}
                      className="pl-10"
                      maxLength={19}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={cardExpiryMonth} onValueChange={setCardExpiryMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={cardExpiryYear} onValueChange={setCardExpiryYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="YY" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i).slice(-2)).map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CVV</Label>
                    <Input
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      type="password"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Your card details are securely processed. We do not store card information.</span>
                </div>
              </>
            )}

            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono text-xs">{invoiceNumber}</span>
              </div>
            </div>
          </div>
        )}

        {paymentState === "processing" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processing payment...</p>
          </div>
        )}

        {paymentState === "pending" && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Phone className="h-6 w-6 text-amber-600" />
            </div>
            <p className="font-medium">Check Your Phone</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {reference && <p className="text-xs text-muted-foreground font-mono">Ref: {reference}</p>}
          </div>
        )}

        {paymentState === "success" && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">Payment Successful!</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {reference && <p className="text-xs text-muted-foreground font-mono">Ref: {reference}</p>}
          </div>
        )}

        {paymentState === "error" && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <p className="font-medium">Payment Failed</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}

        <DialogFooter>
          {paymentState === "idle" && (
            <Button onClick={handlePayment} disabled={!isFormValid} className="w-full">
              {paymentMethod === "card" ? (
                <><CreditCard className="mr-2 h-4 w-4" /> Pay {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
              ) : (
                <><Phone className="mr-2 h-4 w-4" /> Pay {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
              )}
            </Button>
          )}
          {paymentState === "pending" && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Auto-checking… ({pollSeconds}s / 120s)</span>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={handleClose} className="flex-1">Close</Button>
                <Button onClick={() => handleCheckStatus()} disabled={isCheckingStatus} className="flex-1">
                  {isCheckingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Check Status
                </Button>
              </div>
            </div>
          )}
          {(paymentState === "success" || paymentState === "error") && (
            <Button onClick={handleClose} className="w-full">
              {paymentState === "success" ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
