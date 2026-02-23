import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, User, Phone, Eye, EyeOff, Wand2, ShieldCheck } from "lucide-react";
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
  let pass = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
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

export default function SupervisorRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const invitationToken = searchParams.get("token") || "";

  useEffect(() => {
    const invitedEmail = searchParams.get("email");
    if (invitedEmail) setEmail(invitedEmail);
  }, [searchParams]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthInfo = strengthConfig[Math.max(0, strength - 1)] || strengthConfig[0];
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  const handleGeneratePassword = () => {
    const p = generateStrongPassword();
    setPassword(p);
    setConfirmPassword(p);
    setShowPassword(true);
    setShowConfirm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }
    if (strength < 4) {
      toast({ variant: "destructive", title: "Weak Password", description: "Please use a stronger password." });
      return;
    }

    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
          emailRedirectTo: window.location.origin + '/supervisor/signin',
        }
      });

      if (authError) {
        toast({ variant: "destructive", title: "Registration Failed", description: authError.message });
        return;
      }

      if (authData.user) {
        await supabase.from('profiles')
          .update({ full_name: fullName, phone })
          .eq('id', authData.user.id);

        // Accept supervisor invitation via edge function
        if (invitationToken) {
          const { error: acceptError } = await supabase.functions.invoke('accept-supervisor-invitation', {
            body: { email, token: invitationToken },
          });
          if (acceptError) {
            console.warn("Could not accept supervisor invitation:", acceptError.message);
          }
        }

        // Send branded confirmation email
        try {
          await supabase.functions.invoke('send-confirmation-email', {
            body: { email, full_name: fullName, portal: 'supervisor' },
          });
        } catch (e) {
          console.warn("Confirmation email may not have sent:", e);
        }

        await supabase.auth.signOut();

        toast({
          title: "Account Created — Check Your Email",
          description: "Please verify your email address, then sign in to the Supervisor Portal.",
        });
        navigate("/supervisor/signin");
      }
    } catch {
      toast({ variant: "destructive", title: "Unexpected Error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="AHIS Logo" className="h-12 w-auto" />
              <div>
                <p className="text-sm font-bold text-primary leading-tight">Africa Halal Integrity System</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Supervisor Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Supervisor Registration</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Create Your Supervisor Account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Complete your profile to access the Supervisor Portal</p>
          </div>

          {email && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-primary font-medium">🛡️ Invited as Field Supervisor</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your email <strong>{email}</strong> has been pre-filled from the invitation link.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="fullname" type="text" placeholder="John Mwanza" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="+260 97X XXX XXX" required value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 bg-muted/50" disabled={true} readOnly />
              </div>
              <p className="text-xs text-muted-foreground">Email is set from your invitation and cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleGeneratePassword}>
                  <Wand2 className="h-3 w-3" /> Generate
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" disabled={isLoading} />
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
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span className={password.length >= 8 ? "text-green-600" : ""}>✓ 8+ chars</span>
                    <span className={/[A-Z]/.test(password) ? "text-green-600" : ""}>✓ Uppercase</span>
                    <span className={/[a-z]/.test(password) ? "text-green-600" : ""}>✓ Lowercase</span>
                    <span className={/[0-9]/.test(password) ? "text-green-600" : ""}>✓ Number</span>
                    <span className={/[^a-zA-Z0-9]/.test(password) ? "text-green-600" : ""}>✓ Special</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirm-password" type={showConfirm ? "text" : "password"} placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`pl-10 pr-10 h-11 ${!passwordsMatch ? "border-destructive" : ""}`} disabled={isLoading} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!passwordsMatch && <p className="text-xs text-destructive">Passwords do not match</p>}
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading || !passwordsMatch || strength < 4 || !email}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Create Supervisor Account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-6">
            Already have an account?{" "}
            <Link to="/supervisor/signin" className="font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline">
              Sign in to Supervisor Portal
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:relative lg:block lg:w-1/2 border-l overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover" src="/auth-bg.png" alt="AHIS Supervisor Portal" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-primary/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white">
          <ShieldCheck className="h-16 w-16 mb-6 opacity-90" />
          <h3 className="text-3xl font-bold font-serif leading-tight text-center mb-4">Supervisor Portal</h3>
          <p className="text-lg text-white/80 leading-relaxed text-center max-w-md">
            Monitor on-site compliance, submit reports, and help maintain Halal integrity standards.
          </p>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            {["Daily compliance checklists", "Incident & NCR reporting", "Evidence documentation", "Real-time compliance scores"].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-secondary flex-shrink-0" />
                <span className="text-sm text-white/90">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
