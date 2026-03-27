import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, CheckCircle2, AlertTriangle } from "lucide-react";
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

export function MoMoPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  onPaymentComplete,
}: MoMoPaymentDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const { toast } = useToast();

  const phoneRegex = /^0[79]\d{8}$/;
  const isPhoneValid = phoneRegex.test(phoneNumber);

  const handlePayment = async () => {
    if (!isPhoneValid) return;

    setPaymentState("processing");
    setMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("process-momo-payment", {
        body: { invoice_id: invoiceId, phone_number: phoneNumber },
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
      setPhoneNumber("");
      setMessage("");
      setReference("");
      setTransactionId(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Pay with Mobile Money</DialogTitle>
          <DialogDescription>
            Invoice {invoiceNumber} — {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        {paymentState === "idle" && (
          <div className="space-y-4 py-2">
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
            {reference && (
              <p className="text-xs text-muted-foreground font-mono">Ref: {reference}</p>
            )}
          </div>
        )}

        {paymentState === "success" && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">Payment Successful!</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {reference && (
              <p className="text-xs text-muted-foreground font-mono">Ref: {reference}</p>
            )}
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
            <Button onClick={handlePayment} disabled={!isPhoneValid} className="w-full">
              Pay {currency} {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
