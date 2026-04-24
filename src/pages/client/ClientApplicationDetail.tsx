import { useState, useEffect } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { useParams, Link } from "react-router-dom";
import { 
    ArrowLeft, 
    FileText, 
    Package, 
    FolderOpen, 
    Clock,
    CheckCircle,
    Download,
    Eye,
    Building2,
    MapPin,
    Calendar,
    Beaker,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ApplicationChat } from "@/components/application/ApplicationChat";
import { ApplicationTimeline } from "@/components/application/ApplicationTimeline";

type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'awaiting_inspection' | 'inspection_complete' | 'pending_decision' | 'approved' | 'rejected' | 'suspended' | 'withdrawn' | 'expired';

interface Application {
    id: string;
    application_number: string;
    application_type: string;
    status: ApplicationStatus;
    scope: string;
    sector: string;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
    organization: {
        id: string;
        name: string;
        registration_number: string;
        address: string | null;
        city: string | null;
        country: string | null;
    } | null;
}

interface Product {
    id: string;
    name: string;
    brand: string;
    category: string | null;
    ingredients: {
        id: string;
        ingredient_name: string;
        percentage: number | null;
        source: string | null;
        is_halal_certified: boolean;
        supplier_name: string | null;
    }[];
}

interface Document {
    id: string;
    file_name: string;
    document_type: string;
    file_path: string;
    uploaded_at: string;
}

interface StatusHistoryItem {
    id: string;
    from_status: ApplicationStatus | null;
    to_status: ApplicationStatus;
    created_at: string;
    reason: string | null;
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
    submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    awaiting_inspection: { label: "Awaiting Inspection", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    inspection_complete: { label: "Inspection Complete", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    pending_decision: { label: "Pending Decision", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
    approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    suspended: { label: "Suspended", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
    expired: { label: "Expired", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

export default function ClientApplicationDetail() {
    const { id } = useParams<{ id: string }>();
    const [application, setApplication] = useState<Application | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchApplicationDetails();
        }
    }, [id]);

    const fetchApplicationDetails = async () => {
        try {
            // Fetch application with organization
            const { data: appData, error: appError } = await supabase
                .from('certification_applications')
                .select(`
                    *,
                    organization:organizations(id, name, registration_number, address, city, country)
                `)
                .eq('id', id)
                .single();

            if (appError) throw appError;
            setApplication(appData);

            // Fetch products with ingredients
            const { data: productsData } = await supabase
                .from('application_products')
                .select(`
                    id,
                    name,
                    brand,
                    category,
                    ingredients:product_ingredients(
                        id,
                        ingredient_name,
                        percentage,
                        source,
                        is_halal_certified,
                        supplier_name
                    )
                `)
                .eq('application_id', id);

            setProducts(productsData || []);

            // Fetch documents
            const { data: docsData } = await supabase
                .from('application_documents')
                .select('id, file_name, document_type, file_path, uploaded_at')
                .eq('application_id', id)
                .order('uploaded_at', { ascending: false });

            setDocuments(docsData || []);

            // Fetch status history
            const { data: historyData } = await supabase
                .from('application_status_history')
                .select('id, from_status, to_status, created_at, reason')
                .eq('application_id', id)
                .order('created_at', { ascending: true });

            setStatusHistory(historyData || []);
        } catch (error) {
            console.error('Error fetching application details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (filePath: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('application-documents')
                .download(filePath);
            
            if (error) throw error;
            
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    if (loading) {
        return (
            <ClientLayout>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </ClientLayout>
        );
    }

    if (!application) {
        return (
            <ClientLayout>
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Application Not Found</h2>
                    <p className="text-muted-foreground mb-4">The application you're looking for doesn't exist.</p>
                    <Button asChild>
                        <Link to="/client/applications">Back to Applications</Link>
                    </Button>
                </div>
            </ClientLayout>
        );
    }

    const status = statusConfig[application.status];

    return (
        <ClientLayout>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Link to="/client/applications" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Applications
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">
                                {application.application_number}
                            </h1>
                            <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <p className="text-muted-foreground">{application.application_type}</p>
                    </div>
                    {application.status === 'draft' && (
                        <Button asChild className="gap-2">
                            <Link to={`/client/apply?draft=${application.id}`}>
                                Continue & Submit
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                        <TabsTrigger value="overview" className="gap-2">
                            <Building2 className="h-4 w-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="products" className="gap-2">
                            <Package className="h-4 w-4" />
                            Products
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Documents
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="gap-2">
                            <Clock className="h-4 w-4" />
                            Timeline
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Organization Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Organization Name</p>
                                        <p className="font-medium">{application.organization?.name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Registration Number</p>
                                        <p className="font-medium">{application.organization?.registration_number || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Location</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {[application.organization?.city, application.organization?.country].filter(Boolean).join(', ') || "N/A"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Application Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Certification Scope</p>
                                        <p className="font-medium">{application.scope}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Sector</p>
                                        <p className="font-medium">{application.sector}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Submitted</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {application.submitted_at 
                                                ? format(new Date(application.submitted_at), 'dd MMM yyyy, HH:mm')
                                                : "Not submitted yet"
                                            }
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Products Tab */}
                    <TabsContent value="products" className="space-y-6">
                        {products.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">No Products Added</h3>
                                    <p className="text-muted-foreground">No products have been added to this application.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            products.map((product, index) => (
                                <Card key={product.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                                                    {index + 1}
                                                </span>
                                                {product.name}
                                            </span>
                                            <Badge variant="outline">{product.category || "General"}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-muted-foreground">Brand: {product.brand}</p>
                                        
                                        {product.ingredients.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                    <Beaker className="h-4 w-4" />
                                                    Ingredients ({product.ingredients.length})
                                                </p>
                                                <div className="bg-muted/50 rounded-lg p-4">
                                                    <div className="grid gap-2">
                                                        {product.ingredients.map((ing) => (
                                                            <div key={ing.id} className="flex items-center justify-between text-sm">
                                                                <span className="flex items-center gap-2">
                                                                    {ing.is_halal_certified && (
                                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                                    )}
                                                                    {ing.ingredient_name}
                                                                    {ing.percentage && (
                                                                        <span className="text-muted-foreground">({ing.percentage}%)</span>
                                                                    )}
                                                                </span>
                                                                {ing.supplier_name && (
                                                                    <span className="text-muted-foreground text-xs">
                                                                        Supplier: {ing.supplier_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents" className="space-y-6">
                        {documents.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">No Documents</h3>
                                    <p className="text-muted-foreground">No documents have been uploaded for this application.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/10 p-2 rounded">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{doc.file_name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {doc.document_type} • Uploaded {format(new Date(doc.uploaded_at), 'dd MMM yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Chat Tab */}
                    <TabsContent value="chat" className="space-y-6">
                        <ApplicationChat
                            applicationId={application.id}
                            viewerRole="client"
                            participants={[
                                {
                                    name: application.organization?.name || 'Your Business',
                                    role: 'client',
                                    subtitle: application.organization?.registration_number || undefined,
                                },
                                {
                                    name: 'AHIS Certification Team',
                                    role: 'admin',
                                    subtitle: 'Officers & Reviewers',
                                },
                            ]}
                        />
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline" className="space-y-6">
                        <ApplicationTimeline applicationId={application.id} createdAt={application.created_at} />
                    </TabsContent>
                </Tabs>
            </div>
        </ClientLayout>
    );
}
