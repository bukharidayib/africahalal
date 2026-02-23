import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const generateStrongPassword = () => {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const special = "!@#$%^&*()_+-=";
  const all = lower + upper + digits + special;
  let pass = [lower[Math.floor(Math.random() * lower.length)], upper[Math.floor(Math.random() * upper.length)], digits[Math.floor(Math.random() * digits.length)], special[Math.floor(Math.random() * special.length)]];
  for (let i = 4; i < 16; i++) pass.push(all[Math.floor(Math.random() * all.length)]);
  return pass.sort(() => Math.random() - 0.5).join('');
};

const getPasswordStrength = (pass: string) => {
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;
  return score;
};

const strengthConfig = [
  { label: "Very Weak", color: "bg-red-500", pct: 16 },
  { label: "Weak", color: "bg-red-400", pct: 33 },
  { label: "Fair", color: "bg-amber-500", pct: 50 },
  { label: "Good", color: "bg-amber-400", pct: 66 },
  { label: "Strong", color: "bg-green-500", pct: 83 },
  { label: "Very Strong", color: "bg-green-600", pct: 100 },
];

export default function SupervisorResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthInfo = strengthConfig[Math.max(0, strength - 1)] || strengthConfig[0];
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGeneratePassword = () => {
    const p = generateStrongPassword();
    setPassword(p);
    setConfirmPassword(p);
    setShowPassword(true);
    setShowConfirm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." }); return; }
    if (strength < 4) { toast({ variant: "destructive", title: "Weak Password", description: "Please use a stronger password." }); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); }
      else { setIsSuccess(true); setTimeout(() => navigate("/supervisor/signin"), 3000); }
    } catch { toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." }); }
    finally { setIsLoading(false); }
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Supervisor Password Reset</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Set New Password</h2>
            <p className="mt-2 text-sm text-muted-foreground">Choose a strong new password for your supervisor account.</p>
          </div>

          {isSuccess ? (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-serif">Password Updated</h3>
              <p className="text-sm text-muted-foreground">Your password has been reset successfully. Redirecting to sign in...</p>
              <Button variant="outline" className="w-full mt-4 h-11" asChild>
                <Link to="/supervisor/signin">Go to Sign In</Link>
              </Button>
            </div>
          ) : !isReady ? (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
              <Button variant="outline" asChild><Link to="/supervisor/forgot-password">Request New Link</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">New Password *</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleGeneratePassword}>
                    <Wand2 className="h-3 w-3" /> Generate
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strengthInfo.color}`} style={{ width: `${strengthInfo.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{strengthInfo.label}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="confirm" type={showConfirm ? "text" : "password"} placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`pl-10 pr-10 h-11 ${!passwordsMatch ? "border-destructive" : ""}`} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!passwordsMatch && <p className="text-xs text-destructive">Passwords do not match</p>}
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading || !passwordsMatch || strength < 4}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Reset Password
              </Button>
            </form>
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
