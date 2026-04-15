import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, CheckCircle2, AlertTriangle, CreditCard, Smartphone, Lock, Upload, Banknote, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | "offline">("momo");
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

  // Offline payment state
  const [offlineSenderName, setOfflineSenderName] = useState("");
  const [offlineSenderPhone, setOfflineSenderPhone] = useState("");
  const [offlineTxRef, setOfflineTxRef] = useState("");
  const [offlineNotes, setOfflineNotes] = useState("");
  const [offlineFile, setOfflineFile] = useState<File | null>(null);
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const phoneRegex = /^0[79]\d{8}$/;
  const isPhoneValid = phoneRegex.test(phoneNumber);
  const isCardValid = cardNumber.replace(/\s/g, "").length >= 13 && cardExpiryMonth.length === 2 && cardExpiryYear.length >= 2 && cardCvv.length >= 3;
  const isOfflineValid = offlineSenderName.trim().length >= 2 && offlineSenderPhone.trim().length >= 5 && !!offlineFile;
  const isFormValid = paymentMethod === "momo"
    ? (isPhoneValid && channel !== "")
    : paymentMethod === "card"
      ? isCardValid
      : isOfflineValid;

  const handlePayment = async () => {
    if (!isFormValid) return;

    if (paymentMethod === "offline") {
      await handleOfflineSubmit();
      return;
    }

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

      if (error) throw error;

      setMessage(data.message);
      setReference(data.reference || "");
      setTransactionId(data.transaction_id);

      if (data.status === "pending") {
        setPaymentState("pending");
      } else if (data.status === "completed") {
        setPaymentState("success");
        onPaymentComplete?.();
      } else {
        setPaymentState("error");
      }
    } catch (err: any) {
      setPaymentState("error");
      setMessage(err.message || "Payment failed. Please try again.");
      toast({ variant: "destructive", title: "Payment Error", description: err.message });
    }
  };

  const handleOfflineSubmit = async () => {
    if (!offlineFile) return;
    setIsSubmittingOffline(true);
    setPaymentState("processing");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      const fileExt = offlineFile.name.split('.').pop();
      const filePath = `offline-payments/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(filePath, offlineFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("offline_payments")
        .insert({
          invoice_id: invoiceId,
          sender_name: offlineSenderName.trim(),
          sender_phone: offlineSenderPhone.trim(),
          amount,
          transaction_reference: offlineTxRef.trim() || null,
          screenshot_path: filePath,
          notes: offlineNotes.trim() || null,
          submitted_by: user.id,
        });

      if (insertError) throw insertError;

      setPaymentState("success");
      setMessage("Your payment proof has been submitted for review. You will be notified once it's approved.");
    } catch (err: any) {
      setPaymentState("error");
      setMessage(err.message || "Failed to submit payment proof.");
      toast({ variant: "destructive", title: "Submission Error", description: err.message });
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!transactionId) return;

    try {
      const { data, error } = await supabase.functions.invoke("check-payment-status", {
        body: { transaction_id: transactionId },
      });

      if (error) throw error;

      setMessage(data.message);
      if (data.status === "completed") {
        setPaymentState("success");
        onPaymentComplete?.();
      } else if (data.status === "failed") {
        setPaymentState("error");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

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
      setOfflineSenderName("");
      setOfflineSenderPhone("");
      setOfflineTxRef("");
      setOfflineNotes("");
      setOfflineFile(null);
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
            <div className="grid grid-cols-3 gap-2">
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
              <button
                type="button"
                onClick={() => setPaymentMethod("offline")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border-2 p-3 text-xs font-semibold transition-all ${
                  paymentMethod === "offline"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Banknote className="h-4 w-4" />
                Offline
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

            {/* Offline / Manual Payment Form */}
            {paymentMethod === "offline" && (
              <div className="space-y-3">
                {/* Compact merchant info */}
                <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <Banknote className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-foreground">
                    Send to: <span className="font-semibold">African Halal</span> — Acc: <span className="font-mono font-bold">1092045</span>
                  </p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={() => copyToClipboard("1092045")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Two-column layout for name & phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Sender Name *</Label>
                    <Input
                      placeholder="Full name"
                      value={offlineSenderName}
                      onChange={(e) => setOfflineSenderName(e.target.value.slice(0, 100))}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone Number *</Label>
                    <Input
                      placeholder="Phone number"
                      value={offlineSenderPhone}
                      onChange={(e) => setOfflineSenderPhone(e.target.value.replace(/[^0-9+\-\s]/g, "").slice(0, 20))}
                      maxLength={20}
                    />
                  </div>
                </div>

                {/* Two-column: amount & reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      value={`${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reference (optional)</Label>
                    <Input
                      placeholder="Confirmation code"
                      value={offlineTxRef}
                      onChange={(e) => setOfflineTxRef(e.target.value.slice(0, 100))}
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Notes - single row */}
                <div className="space-y-1">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input
                    placeholder="Any additional details"
                    value={offlineNotes}
                    onChange={(e) => setOfflineNotes(e.target.value.slice(0, 500))}
                    maxLength={500}
                  />
                </div>

                {/* File upload - compact */}
                <div className="space-y-1">
                  <Label className="text-xs">Payment Screenshot *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size <= 5 * 1024 * 1024) {
                        setOfflineFile(file);
                      } else if (file) {
                        toast({ variant: "destructive", title: "File too large", description: "Max 5MB." });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {offlineFile ? offlineFile.name : "Upload screenshot or receipt"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Accepted: images or PDF, max 5MB</p>
                </div>
              </div>
            )}

            {paymentMethod !== "offline" && (
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
            )}
          </div>
        )}

        {paymentState === "processing" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {paymentMethod === "offline" ? "Submitting payment proof..." : "Processing payment..."}
            </p>
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
            <p className="font-medium">
              {paymentMethod === "offline" ? "Payment Proof Submitted!" : "Payment Successful!"}
            </p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {reference && <p className="text-xs text-muted-foreground font-mono">Ref: {reference}</p>}
          </div>
        )}

        {paymentState === "error" && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <p className="font-medium">
              {paymentMethod === "offline" ? "Submission Failed" : "Payment Failed"}
            </p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}

        <DialogFooter>
          {paymentState === "idle" && (
            <Button onClick={handlePayment} disabled={!isFormValid || isSubmittingOffline} className="w-full">
              {paymentMethod === "offline" ? (
                <><Upload className="mr-2 h-4 w-4" /> Submit Payment Proof</>
              ) : paymentMethod === "card" ? (
                <><CreditCard className="mr-2 h-4 w-4" /> Pay {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
              ) : (
                <><Phone className="mr-2 h-4 w-4" /> Pay {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
              )}
            </Button>
          )}
          {paymentState === "pending" && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">Close</Button>
              <Button onClick={handleCheckStatus} className="flex-1">Check Status</Button>
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
