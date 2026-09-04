import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowLeft, User, FileText, Phone, Eye, EyeOff, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
    return score; // 0-6
};

const strengthConfig = [
    { label: "Very Weak", color: "bg-red-500", pct: 16 },
    { label: "Weak", color: "bg-red-400", pct: 33 },
    { label: "Fair", color: "bg-amber-500", pct: 50 },
    { label: "Good", color: "bg-amber-400", pct: 66 },
    { label: "Strong", color: "bg-green-500", pct: 83 },
    { label: "Very Strong", color: "bg-green-600", pct: 100 },
];

export default function SignUp() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [nrc, setNrc] = useState("");
    const [nrcError, setNrcError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const isInvited = searchParams.get("invited") === "true";
    const businessInvite = searchParams.get("business_invite") || "";

    useEffect(() => {
        const invitedEmail = searchParams.get("email");
        if (invitedEmail) setEmail(invitedEmail);
    }, [searchParams]);

    const strength = useMemo(() => getPasswordStrength(password), [password]);
    const strengthInfo = strengthConfig[Math.max(0, strength - 1)] || strengthConfig[0];
    const passwordsMatch = confirmPassword === "" || password === confirmPassword;

    if (!businessInvite) {
        return <Navigate to="/contact" replace />;
    }

    const handleGeneratePassword = () => {
        const p = generateStrongPassword();
        setPassword(p);
        setConfirmPassword(p);
        setShowPassword(true);
        setShowConfirm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateNrc(nrc)) {
            setNrcError("Invalid NRC format. Use XXXXXX/XX/1, 2 or 3");
            return;
        }
        if (password !== confirmPassword) {
            toast({ variant: "destructive", title: "Passwords don't match", description: "Please make sure your passwords match." });
            return;
        }
        if (strength < 4) {
            toast({ variant: "destructive", title: "Weak Password", description: "Please use a stronger password with uppercase, lowercase, numbers, and special characters." });
            return;
        }

        setIsLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, nrc, phone },
                    emailRedirectTo: window.location.origin + '/auth/signin',
                }
            });

            if (authError) {
                toast({ variant: "destructive", title: "Registration Failed", description: authError.message });
                return;
            }

            if (authData.user) {
                // Update profile with phone and nrc
                await supabase.from('profiles').update({ phone, nrc }).eq('id', authData.user.id);

                // Send invitation/confirmation email via Resend (branded)
                supabase.functions.invoke('send-confirmation-email', {
                    body: { full_name: fullName, email, redirect_to: window.location.origin + '/auth/signin' }
                }).catch(err => console.error('Confirmation email failed:', err));

                if (isInvited) {
                    await supabase.from('admin_invitations')
                        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                        .eq('email', email).eq('status', 'pending');
                }

                if (businessInvite) {
                    await supabase.functions.invoke('accept-business-user-invitation', {
                        body: { email, token: businessInvite }
                    });
                }

                // Sign out immediately — user must confirm email first
                await supabase.auth.signOut();

                toast({
                    title: "Account Created — Check Your Email",
                    description: "We've sent you a confirmation email. Please click the link to verify your account before signing in.",
                });
                navigate("/auth/signin");
            }
        } catch {
            toast({ variant: "destructive", title: "Unexpected Error", description: "An unexpected error occurred during registration." });
        } finally {
            setIsLoading(false);
        }
    };

    const validateNrc = (value: string) => /^\d{6}\/\d{2}\/[1-3]$/.test(value);

    const handleNrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNrc(value);
        setNrcError(value && !validateNrc(value) ? "Format: 123456/11/1 (Last digit 1-3)" : "");
    };

    return (
        <div className="flex min-h-screen bg-background">
            <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="mb-10">
                        <Link to="/auth/signin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Sign In
                        </Link>
                        <div className="flex items-center gap-3 mb-6">
                            <img src="/logo.png" alt="AHI Logo" className="h-12 w-auto" />
                            <div>
                                <p className="text-sm font-bold text-primary leading-tight">African Halal Institute</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Registration</p>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Create Account</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Sign up to access the client portal and start your Halal journey</p>
                    </div>

                    <div className="space-y-6">
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
                                <Label htmlFor="nrc">NRC Number *</Label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input id="nrc" type="text" placeholder="123456/11/1" required value={nrc} onChange={handleNrcChange} className={`pl-10 h-11 ${nrcError ? "border-destructive focus-visible:ring-destructive" : ""}`} disabled={isLoading} />
                                </div>
                                {nrcError && <p className="text-xs text-destructive pt-1">{nrcError}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input id="email" type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" disabled={isLoading || isInvited} />
                                </div>
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

                            <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading || !passwordsMatch || strength < 4}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Account
                            </Button>
                        </form>


                        <p className="text-center text-sm text-muted-foreground pt-4">
                            Already have an account?
                            <Link
                                to={`/auth/signin${businessInvite ? `?email=${encodeURIComponent(email)}&business_invite=${encodeURIComponent(businessInvite)}` : ""}`}
                                className="ml-1 font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:relative lg:block lg:w-1/2 border-l">
                <div className="absolute inset-0 h-full w-full bg-primary/20 mix-blend-multiply" />
                <img className="absolute inset-0 h-full w-full object-cover" src="/auth-bg.png" alt="African Halal Certification" />
                <div className="absolute inset-0 flex items-end justify-center p-12 bg-gradient-to-t from-primary via-primary/40 to-transparent">
                    <div className="max-w-md text-center text-white space-y-4">
                        <h3 className="text-3xl font-bold font-serif leading-tight">Grow Your Business with Halal</h3>
                        <p className="text-lg text-white/80 leading-relaxed">Achieve certification that opens doors to millions of consumers across Africa and beyond.</p>
                        <div className="flex justify-center gap-4 pt-4">
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                            <div className="h-1 w-8 rounded-full bg-secondary" />
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
