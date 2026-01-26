import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate reset request
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 2000);
    };

    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Side - Form */}
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
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Account Recovery</p>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
                            Reset Password
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            We'll send you an email with instructions to reset your password.
                        </p>
                    </div>

                    {!isSubmitted ? (
                        <div className="space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@company.com"
                                            required
                                            className="pl-10 h-11 border-border focus-visible:ring-primary"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Send Reset Link
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-8 text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <CheckCircle2 className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold font-serif">Check your email</h3>
                            <p className="text-sm text-muted-foreground">
                                We have sent a password reset link to your email address. Please check your inbox and spam folder.
                            </p>
                            <Button variant="outline" className="w-full mt-4 h-11 border-primary/20 hover:bg-primary/5 text-primary" asChild>
                                <Link to="/auth/signin">Return to Sign In</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Image/Branding */}
            <div className="hidden lg:relative lg:block lg:w-1/2 border-l">
                <div className="absolute inset-0 h-full w-full bg-primary/20 mix-blend-multiply" />
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/auth-bg.png"
                    alt="African Halal Certification"
                />
                <div className="absolute inset-0 flex items-end justify-center p-12 bg-gradient-to-t from-primary via-primary/40 to-transparent">
                    <div className="max-w-md text-center text-white space-y-4">
                        <h3 className="text-3xl font-bold font-serif leading-tight">
                            Secure & Reliable
                        </h3>
                        <p className="text-lg text-white/80 leading-relaxed">
                            Your data security is our priority. We use industry-standard encryption to protect your business information.
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                            <div className="h-1 w-8 rounded-full bg-secondary" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
