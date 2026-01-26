import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Loader2, Chrome, ArrowLeft, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SignUp() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate signup
        setTimeout(() => setIsLoading(false), 2000);
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
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Registration</p>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
                            Register Business
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create your client portal account to start your Halal journey
                        </p>
                    </div>

                    <div className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="company">Company Name</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="company"
                                        type="text"
                                        placeholder="Global Foods Ltd"
                                        required
                                        className="pl-10 h-11 border-border focus-visible:ring-primary"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullname">Contact Person Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="fullname"
                                        type="text"
                                        placeholder="John African"
                                        required
                                        className="pl-10 h-11 border-border focus-visible:ring-primary"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Work Email address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="contact@company.com"
                                        required
                                        className="pl-10 h-11 border-border focus-visible:ring-primary"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        className="pl-10 h-11 border-border focus-visible:ring-primary"
                                        disabled={isLoading}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground pt-1">
                                    Must be at least 8 characters with a mix of letters and numbers.
                                </p>
                            </div>

                            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Account
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground tracking-widest font-medium">Or register with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <Button variant="outline" className="w-full h-11 border-border hover:bg-accent transition-all font-medium" onClick={() => { }}>
                                <Chrome className="mr-2 h-4 w-4 text-red-500" />
                                Sign up with Google
                            </Button>
                        </div>

                        <p className="text-center text-sm text-muted-foreground pt-4">
                            Already have an account?{""}
                            <Link to="/auth/signin" className="ml-1 font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline">
                                Sign in here
                            </Link>
                        </p>
                    </div>
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
                            Grow Your Business with Halal
                        </h3>
                        <p className="text-lg text-white/80 leading-relaxed">
                            Achieve certification that opens doors to millions of consumers across Africa and beyond.
                        </p>
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
