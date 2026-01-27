import { ClientLayout } from "@/components/layout/ClientLayout";
import {
    Award,
    Download,
    Search,
    ExternalLink,
    QrCode,
    Info,
    Calendar,
    Clock as ClockIcon,
    History as HistoryIcon,
    BadgeCheck,
    Eye as EyeIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const certificates = [
    {
        id: "AHI-2025-0082",
        scope: "Livestock Processing & Distribution",
        entity: "African Halal Institute - Main Facility",
        issueDate: "20 Jan 2025",
        expiryDate: "20 Jan 2026",
        status: "Active",
        standard: "AHI-GLP-2024",
    },
    {
        id: "AHI-2024-0015",
        scope: "Livestock Processing & Distribution",
        entity: "African Halal Institute - Main Facility",
        issueDate: "15 Jan 2024",
        expiryDate: "15 Jan 2025",
        status: "Expired",
        standard: "AHI-GLP-2024",
    },
];

export default function CertificateVault() {
    const [isLoading, setIsLoading] = useState(true);
    const [certs, setCerts] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .order('issue_date', { ascending: false });

            if (error) throw error;
            setCerts(data || []);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error fetching certificates",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const activeCert = certs.find(c => c.status === 'active');
    return (
        <ClientLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-serif tracking-tight">Certificate Vault</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Secure access to all your issued Halal certifications.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                            <HistoryIcon className="mr-2 h-4 w-4" />
                            Audit Log
                        </Button>
                        <Button className="bg-primary text-white hover:bg-primary/90">
                            <QrCode className="mr-2 h-4 w-4" />
                            Scan & Verify
                        </Button>
                    </div>
                </div>

                {/* Active Certificate Spotlight */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-12 bg-muted rounded-2xl">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : activeCert ? (
                    <div className="relative group overflow-hidden rounded-2xl border-none shadow-2xl bg-gradient-to-br from-primary to-forest-dark p-8 text-white">
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
                            <Award className="h-48 w-48 text-secondary" />
                        </div>

                        <div className="flex-1 space-y-4 mt-6 md:mt-0">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-secondary text-secondary-foreground font-bold hover:bg-secondary">ACTIVE CERTIFICATION</Badge>
                                <span className="text-xs font-mono text-white/60 tracking-widest uppercase">Valid Africawide</span>
                            </div>
                            <h2 className="text-3xl font-bold font-serif tracking-tight">Livestock Processing & Distribution</h2>
                            <p className="text-white/80 max-w-xl leading-relaxed">
                                This certifies that the processes at <span className="text-secondary font-bold">African Halal Large-Scale Facility</span> are in full compliance with Shariah and AHI standards.
                            </p>
                            <div className="flex flex-wrap gap-6 pt-2">
                                <div className="space-y-1">
                                    <span className="block text-[10px] uppercase tracking-widest text-white/50">Issue Date</span>
                                    <span className="font-bold flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-secondary" /> 20 Jan 2025
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[10px] uppercase tracking-widest text-white/50">Expiry Date</span>
                                    <span className="font-bold flex items-center gap-2 text-secondary">
                                        <ClockIcon className="h-4 w-4" /> 20 Jan 2026
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[10px] uppercase tracking-widest text-white/50">Certificate No.</span>
                                    <span className="font-mono font-bold">AHI-2025-0082</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 mt-6 md:mt-0">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-secondary text-secondary-foreground font-bold hover:bg-secondary">ACTIVE CERTIFICATION</Badge>
                                    <span className="text-xs font-mono text-white/60 tracking-widest uppercase">Valid Africawide</span>
                                </div>
                                <h2 className="text-3xl font-bold font-serif tracking-tight">{activeCert.scope}</h2>
                                <p className="text-white/80 max-w-xl leading-relaxed">
                                    This certifies that the processes at <span className="text-secondary font-bold">Your Registered Facility</span> are in full compliance with Shariah and AHI standards.
                                </p>
                                <div className="flex flex-wrap gap-6 pt-2">
                                    <div className="space-y-1">
                                        <span className="block text-[10px] uppercase tracking-widest text-white/50">Issue Date</span>
                                        <span className="font-bold flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-secondary" /> {new Date(activeCert.issue_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block text-[10px] uppercase tracking-widest text-white/50">Expiry Date</span>
                                        <span className="font-bold flex items-center gap-2 text-secondary">
                                            <Clock className="h-4 w-4" /> {new Date(activeCert.expiry_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block text-[10px] uppercase tracking-widest text-white/50">Certificate No.</span>
                                        <span className="font-mono font-bold">{activeCert.certificate_number}</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button className="bg-white text-primary hover:bg-white/90 font-bold px-8 shadow-xl active:scale-95 transition-all">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download High-Res PDF
                                    </Button>
                                    <Button variant="ghost" className="text-white hover:bg-white/10 font-medium">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Verify Online
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center bg-muted rounded-2xl border-2 border-dashed">
                        <Award className="h-12 w-12 mx-auto mb-4 opacity-10" />
                        <p className="text-muted-foreground">No active certificates found.</p>
                    </div>
                )}

                {/* Search & Archives */}
                <div className="space-y-6 pt-12">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold font-serif">Certificate Archive</h3>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by number or scope..." className="pl-10 h-10 bg-muted/20 border-border" />
                        </div>
                    </div>

                    <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr className="text-muted-foreground">
                                    <th className="px-6 py-4 text-left font-bold uppercase tracking-widest text-[11px]">Certificate Details</th>
                                    <th className="px-6 py-4 text-left font-bold uppercase tracking-widest text-[11px]">Standard</th>
                                    <th className="px-6 py-4 text-left font-bold uppercase tracking-widest text-[11px]">Validity</th>
                                    <th className="px-6 py-4 text-left font-bold uppercase tracking-widest text-[11px]">Status</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase tracking-widest text-[11px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                            <p>Fetching archive...</p>
                                        </td>
                                    </tr>
                                ) : certs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            <Award className="h-12 w-12 mx-auto mb-4 opacity-5" />
                                            <p>Your certificate archive is currently empty.</p>
                                        </td>
                                    </tr>
                                ) : certs.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-muted/10 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${cert.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    <BadgeCheck className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-foreground block">{cert.certificate_number}</span>
                                                    <span className="text-xs text-muted-foreground line-clamp-1">{cert.scope}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-2 py-0.5 rounded border border-border bg-muted/20 font-mono text-xs">
                                                STANDARD-AHI
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-xs space-y-1">
                                                <span className="text-muted-foreground block italic">Expires</span>
                                                <span className="font-semibold block">{new Date(cert.expiry_date).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge variant={cert.status === 'active' ? 'secondary' : 'outline'} className="font-bold tracking-tighter">
                                                {cert.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary">
                                                    <EyeIcon className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Regulatory Governance */}
                <div className="p-6 bg-secondary/5 rounded-2xl border border-secondary/10 flex gap-4 items-start max-w-4xl mx-auto mt-20">
                    <Info className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                    <div className="space-y-1">
                        <h4 className="font-bold text-secondary text-sm">Regulatory Notice</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            All digital certificates are issued with an embedded cryptographic signature and QR code for instant global verification. The PDF documents provided in this vault are legally valid and recognized by government and private entities. Forging or tampering with certificate data is a severe violation and will lead to immediate cancellation of all certifications and legal action.
                        </p>
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}
