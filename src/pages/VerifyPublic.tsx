import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
    ShieldCheck,
    Search,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileText,
    BadgeCheck,
    Calendar,
    Building2,
    ExternalLink,
    Info,
    ArrowRight,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VerifyPublic() {
    const [searchParams] = useSearchParams();
    const certIdFromQuery = searchParams.get("cert");

    const [certId, setCertId] = useState(certIdFromQuery || "");
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { toast } = useToast();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!certId) return;

        setIsSearching(true);
        try {
            const { data, error } = await supabase.rpc('verify_certificate_public', {
                cert_number: certId
            });

            if (error) throw error;

            const cert = data && data.length > 0 ? data[0] : null;

            if (cert) {
                setResult({
                    valid: true,
                    id: cert.certificate_number,
                    entity: cert.organization_name || "African Halal Institute Certified Partner",
                    scope: cert.scope,
                    issueDate: new Date(cert.issue_date).toLocaleDateString(),
                    expiryDate: new Date(cert.expiry_date).toLocaleDateString(),
                    status: cert.status,
                    type: "Standard Halal Accreditation"
                });
            } else {
                setResult({ valid: false });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Search Error",
                description: error.message,
            });
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center p-4">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-40 -left-24 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-2xl relative z-10 pt-12 md:pt-20">
                {/* Header */}
                <div className="text-center space-y-4 mb-12">
                    <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
                        <img src="/logo.png" alt="AHI" className="h-20 w-auto mx-auto" />
                    </Link>
                    <h1 className="text-4xl font-bold font-serif tracking-tight text-foreground">
                        Public Verification Portal
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Securely verify the authenticity of any AHI Halal Certificate worldwide.
                    </p>
                </div>

                {/* Search Box */}
                <Card className="border-none shadow-2xl bg-card/80 backdrop-blur overflow-hidden mb-8">
                    <CardContent className="p-6 md:p-8">
                        <form onSubmit={handleVerify} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="Enter Certificate Number (e.g. AHI-2025-0082)"
                                    className="pl-11 h-14 text-lg border-2 focus-visible:ring-primary border-muted bg-white/50"
                                    value={certId}
                                    onChange={(e) => setCertId(e.target.value)}
                                    disabled={isSearching}
                                />
                            </div>
                            <Button type="submit" disabled={isSearching || !certId} className="h-14 px-8 bg-primary text-white font-bold text-lg shadow-lg active:scale-95 transition-all">
                                {isSearching ? <span className="animate-pulse">Verifying...</span> : "Verify Now"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Verification Result */}
                {result && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        {result.valid ? (
                            <Card className="border-none shadow-xl border-t-8 border-green-500 overflow-hidden">
                                <div className="p-10 bg-gradient-to-br from-green-500/5 to-transparent">
                                    <div className="flex flex-col items-center text-center space-y-6">
                                        <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 ring-8 ring-green-500/5">
                                            <CheckCircle2 className="h-12 w-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <Badge className="bg-green-500 text-white hover:bg-green-600 font-bold px-4 py-1 text-sm tracking-widest">VALID CERTIFICATE</Badge>
                                            <h2 className="text-2xl font-bold tracking-tight text-foreground pt-2">Verification Confirmed</h2>
                                            <span className="text-lg font-mono text-muted-foreground">{result.id}</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4 text-left pt-6">
                                            <div className="p-4 rounded-xl bg-white/60 border shadow-sm space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                                    <Building2 className="h-3 w-3" /> Certified Entity
                                                </span>
                                                <span className="font-bold text-foreground block line-clamp-1">{result.entity}</span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/60 border shadow-sm space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                                    <ShieldCheck className="h-3 w-3" /> Certification Scope
                                                </span>
                                                <span className="font-bold text-foreground block line-clamp-1">{result.scope}</span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/60 border shadow-sm space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                                    <Calendar className="h-3 w-3" /> Issue Date
                                                </span>
                                                <span className="font-bold text-foreground block line-clamp-1">{result.issueDate}</span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/60 border shadow-sm space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                                    <Clock className="h-3 w-3" /> Expiry Date
                                                </span>
                                                <span className="font-bold text-secondary block line-clamp-1">{result.expiryDate}</span>
                                            </div>
                                        </div>

                                        <div className="w-full pt-8 space-y-4">
                                            <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border border-dashed rounded-lg">
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground italic">Registered under standard: {result.type}</span>
                                            </div>
                                            <Button variant="ghost" className="w-full text-primary font-bold group" asChild>
                                                <Link to={`/directory?search=${result.entity}`}>
                                                    View Company in Public Directory
                                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="border-none shadow-xl border-t-8 border-destructive overflow-hidden transition-all">
                                <div className="p-12 flex flex-col items-center text-center space-y-6 bg-destructive/5">
                                    <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                        <XCircle className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Invalid Certificate</h2>
                                        <p className="text-muted-foreground max-w-sm">
                                            The certificate number provided does not exist in our system or has been revoked.
                                            If you believe this is an error, please contact AHI integrity team.
                                        </p>
                                    </div>
                                    <Button onClick={() => setCertId("")} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 font-bold">
                                        Try Another Search
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* Verification Advisory */}
                <div className="mt-16 p-6 border-t border-border/50 text-center">
                    <div className="flex items-center justify-center gap-4 opacity-70">
                        <div className="flex flex-col items-center">
                            <BadgeCheck className="h-8 w-8 text-primary mb-1" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">ISO 17065</span>
                        </div>
                        <div className="h-8 w-px bg-border mx-4" />
                        <div className="flex flex-col items-center">
                            <ShieldCheck className="h-8 w-8 text-primary mb-1" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Shariah Board</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-6 font-bold">
                        African Halal Institute Certification Verification Authority
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto py-8 text-center text-xs text-muted-foreground">
                © 2026 African Halal Institute. All Rights Reserved.
            </footer>
        </div>
    );
}
