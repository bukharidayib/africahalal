import { useState, useEffect } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import {
    Check,
    ChevronRight,
    ChevronLeft,
    Upload,
    Info,
    Building2,
    FileBadge,
    BadgeCheck,
    ClipboardList,
    Plus,
    Trash2,
    Loader2,
    Beaker,
    FileCheck,
    Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ProductIngredientModal, Ingredient } from "@/components/client/ProductIngredientModal";
import { MandatoryDocuments } from "@/components/client/MandatoryDocuments";

const steps = [
    { id: 1, name: "Establishment Details", icon: Building2 },
    { id: 2, name: "Certification Scope", icon: FileBadge },
    { id: 3, name: "Product Information", icon: ClipboardList },
    { id: 4, name: "Mandatory Documents", icon: FileCheck },
    { id: 5, name: "Declaration", icon: BadgeCheck },
];

interface ProductItem {
    id: string;
    name: string;
    brand: string;
    category: string;
    ingredients: Ingredient[];
}

interface UploadedFile {
    documentId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
}

export default function CertificationApplication() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [businesses, setBusinesses] = useState<{ id: string; entity_name: string; pacra_number: string }[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState("");
    const [draftId, setDraftId] = useState<string | null>(null);
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fetchBusinesses = async () => {
            const { data } = await supabase.from('client_businesses').select('id, entity_name, pacra_number').order('entity_name');
            setBusinesses(data || []);
        };
        fetchBusinesses();

        // Load draft if draft param is present
        const draftParam = searchParams.get('draft');
        if (draftParam) {
            setDraftId(draftParam);
            loadDraft(draftParam);
        }
    }, [searchParams]);

    // Form State
    const [formData, setFormData] = useState({
        entity_name: "",
        registration_number: "",
        address: "",
        employees: "",
        country: "",
        categories: [] as string[],
        validity_period: "1_year", // Default to 1 Year
        application_fee: 3000,
        products: [] as ProductItem[],
        uploadedFiles: [] as UploadedFile[],
        declaration_confirmed: false,
        declaration_compliance: false,
        signature: ""
    });

    // New product form state
    const [newProduct, setNewProduct] = useState({
        name: "",
        brand: "",
        category: ""
    });

    const loadDraft = async (id: string) => {
        try {
            const { data: app, error } = await supabase
                .from('certification_applications')
                .select(`*, organizations(name, registration_number, address, country)`)
                .eq('id', id)
                .eq('status', 'draft')
                .single();
            if (error || !app) return;

            const org = app.organizations as any;
            setFormData(prev => ({
                ...prev,
                entity_name: org?.name || '',
                registration_number: org?.registration_number || '',
                address: org?.address || '',
                country: org?.country || '',
                categories: app.scope ? app.scope.split(', ') : [],
            }));

            // Load products and ingredients
            const { data: prods } = await supabase
                .from('application_products')
                .select('id, name, brand, category, ingredients:product_ingredients(id, ingredient_name, percentage, source, is_halal_certified, supplier_name)')
                .eq('application_id', id);
            if (prods) {
                setFormData(prev => ({
                    ...prev,
                    products: prods.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        brand: p.brand,
                        category: p.category || 'General',
                        ingredients: (p.ingredients || []).map((i: any) => ({
                            ingredient_name: i.ingredient_name,
                            percentage: i.percentage,
                            source: i.source,
                            is_halal_certified: i.is_halal_certified,
                            supplier_name: i.supplier_name,
                        })),
                    })),
                }));
            }

            toast({ title: "Draft Loaded", description: "Continue editing your draft application." });
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
    };

    const handleSaveDraft = async () => {
        if (!formData.entity_name && !formData.registration_number) {
            toast({ variant: "destructive", title: "Missing Info", description: "Please fill in at least the business details before saving." });
            return;
        }

        setIsSavingDraft(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            let organization_id = profile?.organization_id;

            if (!organization_id) {
                if (!formData.registration_number) throw new Error("Registration number required");
                const { data: orgData, error: orgError } = await supabase.from('organizations').select('id').eq('registration_number', formData.registration_number).single();
                if (orgError && orgError.code === 'PGRST116') {
                    const newOrgId = crypto.randomUUID();
                    await supabase.from('organizations').insert({ id: newOrgId, name: formData.entity_name, registration_number: formData.registration_number, sector: formData.categories[0] || "General", address: formData.address, country: formData.country });
                    organization_id = newOrgId;
                    await supabase.from('profiles').update({ organization_id }).eq('id', user.id);
                } else if (orgError) {
                    throw orgError;
                } else {
                    organization_id = orgData.id;
                }
            }

            if (draftId) {
                // Update existing draft
                await supabase.from('certification_applications').update({
                    scope: formData.categories.join(', '),
                    sector: formData.categories[0] || 'General',
                    updated_at: new Date().toISOString(),
                }).eq('id', draftId);

                // Delete old products and re-insert
                await supabase.from('application_products').delete().eq('application_id', draftId);
                for (const product of formData.products) {
                    const { data: pd } = await supabase.from('application_products').insert({ application_id: draftId, name: product.name, brand: product.brand, category: product.category }).select('id').single();
                    if (pd && product.ingredients.length > 0) {
                        await supabase.from('product_ingredients').insert(product.ingredients.map(i => ({ product_id: pd.id, ingredient_name: i.ingredient_name, percentage: i.percentage, source: i.source, is_halal_certified: i.is_halal_certified, supplier_name: i.supplier_name })));
                    }
                }

                toast({ title: "Draft Saved", description: "Your application draft has been updated." });
            } else {
                // Create new draft
                const { data: appNum } = await supabase.rpc('generate_application_number');
                const { data: appData, error: appErr } = await supabase.from('certification_applications').insert({
                    organization_id,
                    application_type: "Full Certification",
                    sector: formData.categories[0] || "General",
                    scope: formData.categories.join(', '),
                    application_number: appNum || `APP-${Date.now()}`,
                    status: 'draft',
                }).select('id').single();
                if (appErr) throw appErr;

                setDraftId(appData.id);

                for (const product of formData.products) {
                    const { data: pd } = await supabase.from('application_products').insert({ application_id: appData.id, name: product.name, brand: product.brand, category: product.category }).select('id').single();
                    if (pd && product.ingredients.length > 0) {
                        await supabase.from('product_ingredients').insert(product.ingredients.map(i => ({ product_id: pd.id, ingredient_name: i.ingredient_name, percentage: i.percentage, source: i.source, is_halal_certified: i.is_halal_certified, supplier_name: i.supplier_name })));
                    }
                }

                toast({ title: "Draft Saved", description: "Your application has been saved as a draft." });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) return;
        if (currentStep < steps.length) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.entity_name || !formData.registration_number || !formData.address || !formData.country) {
                    toast({
                        variant: "destructive",
                        title: "Missing Information",
                        description: "Please fill in all required fields before proceeding.",
                    });
                    return false;
                }
                return true;
            case 2:
                if (formData.categories.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "Certification Scope Required",
                        description: "Please select at least one certification category.",
                    });
                    return false;
                }
                return true;
            case 3:
                if (formData.products.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "Products Required",
                        description: "Please add at least one product to certify.",
                    });
                    return false;
                }
                // Check if all products have at least one ingredient
                const productsWithoutIngredients = formData.products.filter(p => p.ingredients.length === 0);
                if (productsWithoutIngredients.length > 0) {
                    toast({
                        variant: "destructive",
                        title: "Ingredients Required",
                        description: `Please add ingredients for: ${productsWithoutIngredients.map(p => p.name).join(', ')}`,
                    });
                    return false;
                }
                return true;
            case 4:
                // Check required documents
                const requiredDocIds = ["business_registration", "tax_clearance", "ingredient_spec", "halal_policy"];
                const uploadedDocIds = formData.uploadedFiles.map(f => f.documentId);
                const missingDocs = requiredDocIds.filter(id => !uploadedDocIds.includes(id));
                if (missingDocs.length > 0) {
                    toast({
                        variant: "destructive",
                        title: "Missing Documents",
                        description: "Please upload all required documents before proceeding.",
                    });
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddProduct = () => {
        if (!newProduct.name || !newProduct.brand) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please enter product name and brand.",
            });
            return;
        }

        const product: ProductItem = {
            id: crypto.randomUUID(),
            name: newProduct.name,
            brand: newProduct.brand,
            category: newProduct.category || "General",
            ingredients: []
        };

        setFormData(prev => ({
            ...prev,
            products: [...prev.products, product]
        }));

        setNewProduct({ name: "", brand: "", category: "" });
        setIsAddItemOpen(false);

        toast({
            title: "Product Added",
            description: `${product.name} has been added. Please add ingredients for this product.`,
        });
    };

    const handleRemoveProduct = (productId: string) => {
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter(p => p.id !== productId)
        }));
        toast({
            title: "Product Removed",
            description: "The product has been removed from your application.",
        });
    };

    const openIngredientModal = (productId: string) => {
        setSelectedProductId(productId);
        setIngredientModalOpen(true);
    };

    const handleSaveIngredients = (ingredients: Ingredient[]) => {
        if (!selectedProductId) return;

        setFormData(prev => ({
            ...prev,
            products: prev.products.map(p =>
                p.id === selectedProductId
                    ? { ...p, ingredients }
                    : p
            )
        }));

        toast({
            title: "Ingredients Saved",
            description: `${ingredients.length} ingredient(s) saved for this product.`,
        });
    };

    const handleFileUpload = (file: UploadedFile) => {
        setFormData(prev => ({
            ...prev,
            uploadedFiles: [...prev.uploadedFiles.filter(f => f.documentId !== file.documentId), file]
        }));
    };

    const handleFileRemove = (documentId: string) => {
        setFormData(prev => ({
            ...prev,
            uploadedFiles: prev.uploadedFiles.filter(f => f.documentId !== documentId)
        }));
    };

    const selectedProduct = formData.products.find(p => p.id === selectedProductId);

    const handleSubmit = async () => {
        if (!formData.declaration_confirmed || !formData.declaration_compliance || !formData.signature) {
            toast({
                variant: "destructive",
                title: "Declaration Required",
                description: "Please confirm both declarations and sign before submitting.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Get user's profile to check for organization
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            let organization_id = profile?.organization_id;

            // If no organization, try to find or create one
            if (!organization_id) {
                const { data: orgData, error: orgError } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('registration_number', formData.registration_number)
                    .single();

                if (orgError && orgError.code === 'PGRST116') {
                    const newOrgId = crypto.randomUUID();
                    const { error: createError } = await supabase
                        .from('organizations')
                        .insert({
                            id: newOrgId,
                            name: formData.entity_name,
                            registration_number: formData.registration_number,
                            sector: formData.categories[0] || "General",
                            address: formData.address,
                            country: formData.country
                        });

                    if (createError) throw createError;
                    organization_id = newOrgId;

                    await supabase
                        .from('profiles')
                        .update({ organization_id })
                        .eq('id', user.id);
                } else if (orgError) {
                    throw orgError;
                } else {
                    organization_id = orgData.id;
                }
            }

            let applicationNumber: string;
            let appId: string;

            if (draftId) {
                // Update existing draft to submitted
                const { data: existingApp } = await supabase
                    .from('certification_applications')
                    .select('application_number')
                    .eq('id', draftId)
                    .single();

                applicationNumber = existingApp?.application_number || `APP-${Date.now()}`;

                const { error: updateErr } = await supabase
                    .from('certification_applications')
                    .update({
                        status: 'submitted',
                        submitted_at: new Date().toISOString(),
                        scope: formData.categories.join(', '),
                        sector: formData.categories[0] || "General",
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', draftId);
                if (updateErr) throw updateErr;
                appId = draftId;

                // Clear old products and re-insert
                await supabase.from('application_products').delete().eq('application_id', draftId);
            } else {
                // Generate application number
                const { data: appNumberData } = await supabase.rpc('generate_application_number');
                applicationNumber = appNumberData || `APP-${Date.now()}`;

                // Insert Application
                const { data: appData, error: appError } = await supabase
                    .from('certification_applications')
                    .insert({
                        organization_id,
                        application_type: "Full Certification",
                        sector: formData.categories[0] || "General",
                        scope: formData.categories.join(', '),
                        application_number: applicationNumber,
                        status: 'submitted',
                        submitted_at: new Date().toISOString()
                    })
                    .select('id')
                    .single();
                if (appError) throw appError;
                appId = appData.id;
            }

            // Insert Products and Ingredients
            for (const product of formData.products) {
                const { data: productData, error: productError } = await supabase
                    .from('application_products')
                    .insert({
                        application_id: appId,
                        name: product.name,
                        brand: product.brand,
                        category: product.category
                    })
                    .select('id')
                    .single();

                if (productError) throw productError;

                // Insert ingredients for this product
                if (product.ingredients.length > 0) {
                    const ingredientsToInsert = product.ingredients.map(ing => ({
                        product_id: productData.id,
                        ingredient_name: ing.ingredient_name,
                        percentage: ing.percentage,
                        source: ing.source,
                        is_halal_certified: ing.is_halal_certified,
                        supplier_name: ing.supplier_name
                    }));

                    const { error: ingError } = await supabase
                        .from('product_ingredients')
                        .insert(ingredientsToInsert);

                    if (ingError) throw ingError;
                }
            }

            // Link uploaded documents to application
            for (const file of formData.uploadedFiles) {
                await supabase
                    .from('application_documents')
                    .insert({
                        application_id: appId,
                        document_type: file.documentId,
                        file_name: file.fileName,
                        file_path: file.filePath,
                        file_size: file.fileSize,
                        uploaded_by: user.id
                    });
            }

            // Log Audit
            await supabase.rpc('log_audit', {
                _action: 'application_submitted',
                _resource_type: 'certification_applications',
                _resource_id: appId,
                _metadata: {
                    step: 'submission',
                    products_count: formData.products.length,
                    documents_count: formData.uploadedFiles.length,
                    categories: formData.categories
                }
            });

            // Create invoice for application fee
            try {
                const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
                const validityLabel = formData.validity_period === '6_months' ? '6 Months' : '1 Year';
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30);

                await supabase.from('invoices').insert({
                    invoice_number: invoiceNumber || `AHIS-INV-${Date.now()}`,
                    organization_id: organization_id,
                    application_id: appId,
                    fee_type: 'application_fee',
                    description: `Halal Certification Application Fee - ${validityLabel} Validity (${applicationNumber})`,
                    amount: formData.application_fee,
                    currency: 'ZMW',
                    due_date: dueDate.toISOString().split('T')[0],
                    status: 'pending',
                });
            } catch (invoiceErr) {
                console.error('Failed to create invoice:', invoiceErr);
            }

            // Send submission status email (fire and forget)
            try {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('name, contact_email')
                    .eq('id', organization_id)
                    .single();

                await supabase.functions.invoke('send-status-notification', {
                    body: {
                        application_id: appId,
                        new_status: 'submitted',
                        application_number: applicationNumber,
                        organization_name: org?.name || formData.entity_name,
                        contact_email: org?.contact_email || user.email,
                    }
                });
            } catch (emailErr) {
                console.error('Failed to send submission email:', emailErr);
            }

            toast({
                title: "Application Submitted Successfully",
                description: `Application ${applicationNumber} has been sent for review.`,
            });
            navigate("/client/applications");
        } catch (error: any) {
            console.error('Submission error:', error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">Certification Application</h1>
                    <p className="text-muted-foreground mt-1">Please provide accurate information. This application is legally binding.</p>
                </div>

                {/* Stepper */}
                <nav aria-label="Progress">
                    <ol role="list" className="flex items-center justify-between w-full">
                        {steps.map((step, stepIdx) => (
                            <li key={step.name} className="relative flex-1">
                                {stepIdx !== steps.length - 1 && (
                                    <div className="absolute top-5 left-0 w-full h-0.5 bg-muted" aria-hidden="true" />
                                )}
                                <div className="group relative flex flex-col items-center">
                                    <span className="flex h-10 items-center justify-center">
                                        <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${currentStep > step.id
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : currentStep === step.id
                                                ? "bg-card border-secondary text-secondary ring-4 ring-secondary/10"
                                                : "bg-card border-muted text-muted-foreground"
                                            }`}>
                                            {currentStep > step.id ? <Check className="h-6 w-6" /> : <step.icon className="h-5 w-5" />}
                                        </span>
                                    </span>
                                    <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-center text-foreground">
                                        {step.name}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </nav>

                {/* Content */}
                <Card className="border shadow-xl bg-card">
                    <CardContent className="p-8">
                        {/* Step 1: Establishment Details */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-foreground">Select Business Entity *</Label>
                                        <Select
                                            value={selectedBusinessId}
                                            onValueChange={(v) => {
                                                setSelectedBusinessId(v);
                                                const biz = businesses.find(b => b.id === v);
                                                if (biz) {
                                                    updateFormData('entity_name', biz.entity_name);
                                                    updateFormData('registration_number', biz.pacra_number);
                                                }
                                            }}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select your registered business" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {businesses.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.entity_name} — {b.pacra_number}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {businesses.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                No businesses registered.{" "}
                                                <Link to="/client/businesses" className="text-primary underline">Register a business first</Link>
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address" className="text-foreground">Physical Address of Establishment *</Label>
                                        <Textarea
                                            id="address"
                                            placeholder="Factory / Facility Location"
                                            className="resize-none"
                                            value={formData.address}
                                            onChange={(e) => updateFormData('address', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="employees" className="text-foreground">Total Employees</Label>
                                        <Input
                                            id="employees"
                                            type="number"
                                            className="h-11"
                                            placeholder="e.g. 50"
                                            value={formData.employees}
                                            onChange={(e) => updateFormData('employees', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country" className="text-foreground">Operating City *</Label>
                                        <Select
                                            value={formData.country}
                                            onValueChange={(v) => updateFormData('country', v)}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select City" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* Lusaka Province */}
                                                <SelectItem value="Lusaka">Lusaka</SelectItem>
                                                <SelectItem value="Chongwe">Chongwe</SelectItem>
                                                <SelectItem value="Kafue">Kafue</SelectItem>
                                                {/* Copperbelt Province */}
                                                <SelectItem value="Ndola">Ndola</SelectItem>
                                                <SelectItem value="Kitwe">Kitwe</SelectItem>
                                                <SelectItem value="Chingola">Chingola</SelectItem>
                                                <SelectItem value="Mufulira">Mufulira</SelectItem>
                                                <SelectItem value="Luanshya">Luanshya</SelectItem>
                                                <SelectItem value="Kalulushi">Kalulushi</SelectItem>
                                                <SelectItem value="Chililabombwe">Chililabombwe</SelectItem>
                                                {/* Central Province */}
                                                <SelectItem value="Kabwe">Kabwe</SelectItem>
                                                <SelectItem value="Kapiri Mposhi">Kapiri Mposhi</SelectItem>
                                                <SelectItem value="Mkushi">Mkushi</SelectItem>
                                                {/* Southern Province */}
                                                <SelectItem value="Livingstone">Livingstone</SelectItem>
                                                <SelectItem value="Choma">Choma</SelectItem>
                                                <SelectItem value="Mazabuka">Mazabuka</SelectItem>
                                                <SelectItem value="Monze">Monze</SelectItem>
                                                {/* Eastern Province */}
                                                <SelectItem value="Chipata">Chipata</SelectItem>
                                                <SelectItem value="Petauke">Petauke</SelectItem>
                                                <SelectItem value="Katete">Katete</SelectItem>
                                                {/* Northern Province */}
                                                <SelectItem value="Kasama">Kasama</SelectItem>
                                                <SelectItem value="Mbala">Mbala</SelectItem>
                                                <SelectItem value="Mpika">Mpika</SelectItem>
                                                {/* North-Western Province */}
                                                <SelectItem value="Solwezi">Solwezi</SelectItem>
                                                <SelectItem value="Mwinilunga">Mwinilunga</SelectItem>
                                                {/* Western Province */}
                                                <SelectItem value="Mongu">Mongu</SelectItem>
                                                <SelectItem value="Senanga">Senanga</SelectItem>
                                                {/* Luapula Province */}
                                                <SelectItem value="Mansa">Mansa</SelectItem>
                                                <SelectItem value="Samfya">Samfya</SelectItem>
                                                {/* Muchinga Province */}
                                                <SelectItem value="Chinsali">Chinsali</SelectItem>
                                                <SelectItem value="Nakonde">Nakonde</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Certification Scope */}
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="bg-primary/5 p-4 rounded-lg flex gap-3 items-start border border-primary/10">
                                    <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-primary/80">
                                        The scope determines the inspection criteria and technical requirements for your entity.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-foreground">Select Certification Category (select all that apply) *</Label>
                                    {[
                                        "Restuarents & Coffee",
                                        "Abbatoirs",
                                        "Meat Processing",
                                        "Hospitality",
                                        "Manufacturies"
                                    ].map((cat) => (
                                        <div
                                            key={cat}
                                            className={`flex items-center space-x-3 p-4 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group ${formData.categories.includes(cat) ? 'border-primary bg-primary/5' : 'border-border'
                                                }`}
                                            onClick={() => {
                                                const current = formData.categories;
                                                const next = current.includes(cat)
                                                    ? current.filter(c => c !== cat)
                                                    : [...current, cat];
                                                updateFormData('categories', next);
                                            }}
                                        >
                                            <Checkbox
                                                id={cat}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                checked={formData.categories.includes(cat)}
                                                onCheckedChange={() => { }}
                                            />
                                            <label htmlFor={cat} className="text-sm font-medium leading-none cursor-pointer flex-1 text-foreground">{cat}</label>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <Label className="text-foreground">Certification Validity Period *</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${formData.validity_period === '6_months' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                            onClick={() => { updateFormData('validity_period', '6_months'); updateFormData('application_fee', 1500); }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-foreground">6 Months</span>
                                                <Badge variant="outline" className="bg-background">ZMW 1,500</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Short-term certification valid for six months from issuance.</p>
                                        </div>

                                        <div
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${formData.validity_period === '1_year' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                            onClick={() => { updateFormData('validity_period', '1_year'); updateFormData('application_fee', 3000); }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-foreground">1 Year</span>
                                                <Badge variant="outline" className="bg-background">ZMW 3,000</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Standard certification valid for one year from issuance.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Product Information */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-foreground text-base">Product List *</Label>
                                            <p className="text-sm text-muted-foreground mt-1">Add all products to be covered under this certification with their ingredients.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setIsAddItemOpen(true)}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Product
                                        </Button>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Brand</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                                                    <th className="px-4 py-3 text-center font-semibold">Ingredients</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.products.length === 0 ? (
                                                    <tr className="border-t bg-muted/20">
                                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                            <p className="italic">No products added yet.</p>
                                                            <p className="text-xs mt-1">Click "Add Product" to add products to your certification scope.</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    formData.products.map((product) => (
                                                        <tr key={product.id} className="border-t hover:bg-muted/30 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                                                            <td className="px-4 py-3 text-muted-foreground">{product.brand}</td>
                                                            <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="gap-1"
                                                                    onClick={() => openIngredientModal(product.id)}
                                                                >
                                                                    <Beaker className="h-4 w-4" />
                                                                    {product.ingredients.length > 0 ? (
                                                                        <Badge variant="secondary" className="ml-1">
                                                                            {product.ingredients.length}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-destructive text-xs">Add</span>
                                                                    )}
                                                                </Button>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleRemoveProduct(product.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {formData.products.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {formData.products.length} product(s) added. Each product must have at least one ingredient.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 4: Mandatory Documents */}
                        {currentStep === 4 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="bg-primary/5 p-4 rounded-lg flex gap-3 items-start border border-primary/10">
                                    <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-primary/80">
                                        Upload all required documents to support your certification application. Accepted formats include PDF, images, and Office documents.
                                    </p>
                                </div>
                                <MandatoryDocuments
                                    applicationId={null}
                                    uploadedFiles={formData.uploadedFiles}
                                    onUpload={handleFileUpload}
                                    onRemove={handleFileRemove}
                                />
                            </div>
                        )}

                        {/* Step 5: Declaration */}
                        {currentStep === 5 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-4 border rounded-xl p-6 bg-muted/20">
                                    <h3 className="font-bold text-lg font-serif text-foreground">Legal Declaration</h3>
                                    <div className="space-y-4">
                                        <div
                                            className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData.declaration_confirmed ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                                }`}
                                            onClick={() => updateFormData('declaration_confirmed', !formData.declaration_confirmed)}
                                        >
                                            <Checkbox
                                                id="dec1"
                                                className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                checked={formData.declaration_confirmed}
                                                onCheckedChange={(checked) => updateFormData('declaration_confirmed', checked === true)}
                                            />
                                            <label htmlFor="dec1" className="text-sm leading-relaxed cursor-pointer text-foreground">
                                                I hereby declare that all information provided in this application is true and correct to the best of my knowledge. I understand that providing false information may result in rejection or revocation of certification.
                                            </label>
                                        </div>
                                        <div
                                            className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData.declaration_compliance ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                                }`}
                                            onClick={() => updateFormData('declaration_compliance', !formData.declaration_compliance)}
                                        >
                                            <Checkbox
                                                id="dec2"
                                                className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                checked={formData.declaration_compliance}
                                                onCheckedChange={(checked) => updateFormData('declaration_compliance', checked === true)}
                                            />
                                            <label htmlFor="dec2" className="text-sm leading-relaxed cursor-pointer text-foreground">
                                                I agree to comply with the AHI Halal Standards and allow inspection visits as per the certification procedure. I understand that certification is subject to ongoing compliance.
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Electronic Signature (Full Name) *</Label>
                                    <Input
                                        placeholder="Type your full legal name"
                                        className="h-11 font-serif text-lg italic"
                                        value={formData.signature}
                                        onChange={(e) => updateFormData('signature', e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        By typing your name above, you acknowledge this as your electronic signature.
                                    </p>
                                </div>

                                {/* Summary */}
                                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                                    <h4 className="font-semibold text-sm mb-3 text-foreground">Application Summary</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Entity:</span>
                                        <span className="text-foreground">{formData.entity_name || "Not provided"}</span>
                                        <span className="text-muted-foreground">Registration:</span>
                                        <span className="text-foreground">{formData.registration_number || "Not provided"}</span>
                                        <span className="text-muted-foreground">Location:</span>
                                        <span className="text-foreground">{formData.country || "Not provided"}</span>
                                        <span className="text-muted-foreground">Categories:</span>
                                        <span className="text-foreground">{formData.categories.length} selected</span>
                                        <span className="text-muted-foreground">Products:</span>
                                        <span className="text-foreground">{formData.products.length} items</span>
                                        <span className="text-muted-foreground">Documents:</span>
                                        <span className="text-foreground">{formData.uploadedFiles.length} uploaded</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-12 pt-8 border-t">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                disabled={currentStep === 1 || isLoading}
                                className="h-11 font-bold group"
                            >
                                <ChevronLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                Previous Step
                            </Button>

                            {currentStep < steps.length ? (
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleSaveDraft}
                                        disabled={isLoading || isSavingDraft}
                                        className="h-11 font-bold"
                                    >
                                        {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Draft
                                    </Button>
                                    <Button
                                        onClick={handleNext}
                                        disabled={isLoading}
                                        className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold group"
                                    >
                                        Continue
                                        <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleSaveDraft}
                                        disabled={isLoading || isSavingDraft}
                                        className="h-11 font-bold"
                                    >
                                        {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Draft
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className="h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold px-8 shadow-lg shadow-secondary/20"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                Final Submit & Lock
                                                <Upload className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Governance Note */}
                <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    ⚠️ Notice: Once submitted, applications cannot be edited without formal written request.
                </p>
            </div>

            {/* Add Product Dialog */}
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Product</DialogTitle>
                        <DialogDescription>
                            Enter the details of the product to be certified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="product-name">Product Name *</Label>
                            <Input
                                id="product-name"
                                placeholder="e.g. Frozen Beef Patties"
                                value={newProduct.name}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="product-brand">Brand Name *</Label>
                            <Input
                                id="product-brand"
                                placeholder="e.g. Sarah Foods"
                                value={newProduct.brand}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, brand: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="product-category">Category</Label>
                            <Select
                                value={newProduct.category}
                                onValueChange={(v) => setNewProduct(prev => ({ ...prev, category: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Food & Beverages">Food & Beverages</SelectItem>
                                    <SelectItem value="Meat & Poultry">Meat & Poultry</SelectItem>
                                    <SelectItem value="Dairy Products">Dairy Products</SelectItem>
                                    <SelectItem value="Processed Foods">Processed Foods</SelectItem>
                                    <SelectItem value="Cosmetics">Cosmetics</SelectItem>
                                    <SelectItem value="Pharmaceuticals">Pharmaceuticals</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddProduct}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ingredient Modal */}
            <ProductIngredientModal
                open={ingredientModalOpen}
                onOpenChange={setIngredientModalOpen}
                productName={selectedProduct?.name || ""}
                ingredients={selectedProduct?.ingredients || []}
                onSave={handleSaveIngredients}
            />
        </ClientLayout>
    );
}
