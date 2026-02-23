import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SupervisorForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            email,
            redirect_to: window.location.origin + "/supervisor/reset-password",
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to send reset email." });
      } else {
        setIsSubmitted(true);
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <Link to="/supervisor/signin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="AHI Logo" className="h-12 w-auto" />
              <div>
                <p className="text-sm font-bold text-primary leading-tight">African Halal Institute</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Supervisor Account Recovery</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Reset Password</h2>
            <p className="mt-2 text-sm text-muted-foreground">We'll send you an email with instructions to reset your password.</p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="name@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" disabled={isLoading} />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-serif">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We have sent a password reset link to <span className="font-semibold text-foreground">{email}</span>. Please check your inbox and spam folder.
              </p>
              <Button variant="outline" className="w-full mt-4 h-11 border-primary/20 hover:bg-primary/5 text-primary" asChild>
                <Link to="/supervisor/signin">Return to Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:relative lg:block lg:w-1/2 border-l">
        <div className="absolute inset-0 h-full w-full bg-primary/20 mix-blend-multiply" />
        <img className="absolute inset-0 h-full w-full object-cover" src="/auth-bg.png" alt="African Halal Certification" />
        <div className="absolute inset-0 flex items-end justify-center p-12 bg-gradient-to-t from-primary via-primary/40 to-transparent">
          <div className="max-w-md text-center text-white space-y-4">
            <h3 className="text-3xl font-bold font-serif leading-tight">Secure & Reliable</h3>
            <p className="text-lg text-white/80 leading-relaxed">Your data security is our priority.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
