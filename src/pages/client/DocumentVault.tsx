import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import {
    Files,
    Upload,
    Search,
    Filter,
    MoreVertical,
    Download,
    Eye,
    Clock,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    FileText,
    Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const categories = [
    "All Documents",
    "Ingredient Lists",
    "Supplier Declarations",
    "SOPs & Protocols",
    "Sanitation Logs",
    "Legal & Admin"
];

const documents = [
    {
        id: "DOC-001",
        name: "Standard Operating Procedure - Slaughter.pdf",
        category: "SOPs & Protocols",
        status: "Verified",
        date: "20 Jan 2026",
        expiry: "20 Jan 2027",
        size: "2.4 MB"
    },
    {
        id: "DOC-002",
        name: "Supplier Declaration - Zenith Meats.jpg",
        category: "Supplier Declarations",
        status: "Under Review",
        date: "22 Jan 2026",
        expiry: "N/A",
        size: "1.1 MB"
    },
    {
        id: "DOC-003",
        name: "Halal Policy Statement 2026.pdf",
        category: "Legal & Admin",
        status: "Verified",
        date: "15 Jan 2026",
        expiry: "15 Jan 2030",
        size: "0.8 MB"
    },
    {
        id: "DOC-004",
        name: "Cleaning & Sanitation Schedule Q1.pdf",
        category: "Sanitation Logs",
        status: "Expired",
        date: "01 Nov 2025",
        expiry: "01 Jan 2026",
        size: "1.5 MB"
    },
];

export default function DocumentVault() {
    const [activeTab, setActiveTab] = useState("All Documents");
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [docs, setDocs] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('application_documents')
                .select(`
                    *,
                    certification_applications (
                        application_number,
                        organizations (name)
                    )
                `)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            setDocs(data || []);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error fetching documents",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Get user's profile to find their organization_id
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profileError) throw new Error("Could not retrieve your profile");
            if (!profile?.organization_id) throw new Error("No organization linked to your account. Please submit an application first.");

            // 2. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('application-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 3. Get latest application for this user's organization
            const { data: appData, error: appError } = await supabase
                .from('certification_applications')
                .select('id')
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (appError || !appData) {
                throw new Error("No application found. Please submit a certification application first.");
            }

            // 4. Insert document record
            const { error: dbError } = await supabase
                .from('application_documents')
                .insert({
                    application_id: appData.id,
                    document_type: 'Evidence',
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    uploaded_by: user.id
                });

            if (dbError) throw dbError;

            toast({
                title: "Document Uploaded",
                description: "Your document has been securely stored in the vault.",
            });
            fetchDocuments();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message,
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ClientLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-serif tracking-tight">Document vault</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Review, track, and upload your compliance evidence.</p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="file"
                            className="hidden"
                            id="file-upload"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                        <Button
                            asChild
                            className="bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer"
                            disabled={isUploading}
                        >
                            <label htmlFor="file-upload">
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {isUploading ? "Uploading..." : "Upload Evidence"}
                            </label>
                        </Button>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-muted/30 border-l-4 border-secondary p-4 rounded-r-lg flex gap-4 items-start">
                    <ShieldCheck className="h-6 w-6 text-secondary mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-foreground">Governance Rule: No Deletion</p>
                        <p className="text-muted-foreground mt-0.5">
                            To maintain certification integrity, documents cannot be deleted once uploaded. You can upload new versions if corrections are required.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search document by name..." className="pl-10 h-11 border-border" />
                    </div>
                    <Button variant="outline" className="h-11">
                        <Filter className="mr-2 h-4 w-4" />
                        Advanced Filter
                    </Button>
                </div>

                {/* Categories Tabs */}
                <Tabs defaultValue="All Documents" className="w-full" onValueChange={setActiveTab}>
                    <div className="overflow-x-auto pb-2 scrollbar-hide">
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 w-max">
                            {categories.map((cat) => (
                                <TabsTrigger
                                    key={cat}
                                    value={cat}
                                    className="px-4 py-2 rounded-full border-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary transition-all font-bold text-xs uppercase"
                                >
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>

                {/* Document List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4" />
                            <p>Loading your documents...</p>
                        </div>
                    ) : docs.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                            <Files className="h-12 w-12 mb-4 opacity-20" />
                            <p>No documents found in your vault.</p>
                        </div>
                    ) : docs
                        .filter(doc => activeTab === "All Documents" || doc.document_type === activeTab)
                        .map((doc) => (
                            <Card key={doc.id} className="group hover:shadow-xl transition-all duration-300 border-none bg-card shadow-md relative overflow-hidden">
                                {/* Status Ribbon - Placeholder status */}
                                <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-bl-lg bg-amber-500/10 text-amber-600`}>
                                    Pending
                                </div>

                                <CardHeader className="pt-8 pb-4">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-base font-bold leading-tight line-clamp-2">
                                        {doc.file_name}
                                    </CardTitle>
                                    <CardDescription className="text-xs uppercase font-mono tracking-tighter mt-1">
                                        {doc.document_type}
                                    </CardDescription>
                                    {doc.certification_applications?.organizations?.name && (
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {doc.certification_applications.organizations.name}
                                        </p>
                                    )}
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block">Uploaded:</span>
                                            <span className="font-semibold">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Size:</span>
                                            <span className="font-semibold">{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t border-border/50">
                                        <span className="text-[10px] font-mono text-muted-foreground">{doc.id.split('-')[0]}</span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors" onClick={async () => {
                                                try {
                                                    const { data, error } = await supabase.storage.from('application-documents').createSignedUrl(doc.file_path, 300);
                                                    if (error) throw error;
                                                    window.open(data.signedUrl, '_blank');
                                                } catch (err: any) {
                                                    toast({ variant: 'destructive', title: 'Error', description: err.message });
                                                }
                                            }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors" onClick={async () => {
                                                try {
                                                    const { data, error } = await supabase.storage.from('application-documents').createSignedUrl(doc.file_path, 300, { download: true });
                                                    if (error) throw error;
                                                    const a = document.createElement('a');
                                                    a.href = data.signedUrl;
                                                    a.download = doc.file_name;
                                                    a.click();
                                                } catch (err: any) {
                                                    toast({ variant: 'destructive', title: 'Error', description: err.message });
                                                }
                                            }}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>New Version</DropdownMenuItem>
                                                    <DropdownMenuItem>Share with AHI</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-muted-foreground opacity-50 cursor-not-allowed">Delete (Disabled)</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            </div>
        </ClientLayout>
    );
}
