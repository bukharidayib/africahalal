import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const isUnconfirmed = error.message?.toLowerCase().includes("email not confirmed");
        toast({
          variant: "destructive",
          title: isUnconfirmed ? "Email Not Verified" : "System Error",
          description: isUnconfirmed
            ? "Please check your inbox and click the confirmation link before signing in."
            : error.message,
        });
        return;
      }

      toast({
        title: "Authentication Successful",
        description: "Welcome to the AHI Client Portal."
      });
      navigate("/client/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "An unexpected error occurred during sign-in."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
            {/* Left Side - Form */}
            <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="mb-10">
                        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                        <div className="flex items-center gap-3 mb-6">
                            <img src="/logo.png" alt="AHI Logo" className="h-12 w-auto" />
                            <div>
                                <p className="text-sm font-bold text-primary leading-tight">African Halal Institute</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Client Portal</p>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
                            Welcome Back
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Sign in to manage your certifications and applications
                        </p>
                    </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-border focus-visible:ring-primary"
                    disabled={isLoading} />

                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                    to="/auth/forgot-password"
                    className="text-xs font-medium text-secondary hover:text-secondary/80 underline-offset-4 hover:underline">

                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 border-border focus-visible:ring-primary"
                    disabled={isLoading} />

                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox id="remember" className="data-[state=checked]:bg-primary border-muted-foreground" />
                                <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">
                                    Keep me signed in
                                </Label>
                            </div>

                            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sign In to Portal
                            </Button>
                        </form>


                        <p className="text-center text-sm text-muted-foreground pt-4">
                            Don't have a portal account?{""}
                            <Link to="/auth/signup" className="ml-1 font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline">
                                Create Account
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
          alt="African Halal Certification" />

                <div className="absolute inset-0 flex items-end justify-center p-12 bg-gradient-to-t from-primary via-primary/40 to-transparent">
                    <div className="max-w-md text-center text-white space-y-4">
                        <h3 className="text-3xl font-bold font-serif leading-tight">
                            African Halal Excellence
                        </h3>
                        <p className="text-lg text-white/80 leading-relaxed">
                            Managing your Halal journey with integrity, compliance, and leadership across the continent.
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <div className="h-1 w-8 rounded-full bg-secondary" />
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                        </div>
                    </div>
                </div>
            </div>
        </div>);

}