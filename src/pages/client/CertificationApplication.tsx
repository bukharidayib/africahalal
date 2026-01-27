import { useState } from "react";
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
    ClipboardList
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const steps = [
    { id: 1, name: "Establishment Details", icon: Building2 },
    { id: 2, name: "Certification Scope", icon: FileBadge },
    { id: 3, name: "Product Information", icon: ClipboardList },
    { id: 4, name: "Declaration", icon: BadgeCheck },
];

export default function CertificationApplication() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        entity_name: "",
        registration_number: "",
        address: "",
        employees: "",
        country: "",
        categories: [] as string[],
        products: [] as { name: string, brand: string }[],
        declaration_confirmed: false,
        signature: ""
    });

    const handleNext = () => {
        if (currentStep < steps.length) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.declaration_confirmed || !formData.signature) {
            toast({
                variant: "destructive",
                title: "Declaration Required",
                description: "Please confirm the declaration and sign before submitting.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // 1. Get organization (or create/find)
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id')
                .eq('registration_number', formData.registration_number)
                .single();

            let organization_id = orgData?.id;

            if (orgError && orgError.code === 'PGRST116') {
                // Create org if doesn't exist
                const { data: newOrg, error: createError } = await supabase
                    .from('organizations')
                    .insert({
                        name: formData.entity_name,
                        registration_number: formData.registration_number,
                        sector: formData.categories[0] || "General",
                        address: formData.address,
                        country: formData.country
                    })
                    .select('id')
                    .single();

                if (createError) throw createError;
                organization_id = newOrg.id;
            } else if (orgError) {
                throw orgError;
            }

            // 2. Insert Application
            const { data: appData, error: appError } = await supabase
                .from('certification_applications')
                .insert({
                    organization_id,
                    application_type: "Full Certification",
                    sector: formData.categories[0] || "General",
                    scope: formData.categories.join(', '),
                    application_number: `APP-${Math.floor(1000 + Math.random() * 9000)}`,
                    status: 'submitted'
                })
                .select('id')
                .single();

            if (appError) throw appError;

            // 3. Log Audit
            await supabase.rpc('log_audit', {
                _action: 'application_submitted',
                _resource_type: 'certification_applications',
                _resource_id: appData.id,
                _metadata: { step: 'submission' }
            });

            toast({
                title: "Application Submitted Successfully",
                description: "Your application has been locked and sent to AHI for review.",
            });
            navigate("/client/dashboard");
        } catch (error: any) {
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
                    <h1 className="text-3xl font-bold font-serif tracking-tight">Certification Application</h1>
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
                                            ? "bg-primary border-primary text-white"
                                            : currentStep === step.id
                                                ? "bg-card border-secondary text-secondary ring-4 ring-secondary/10"
                                                : "bg-card border-muted text-muted-foreground"
                                            }`}>
                                            {currentStep > step.id ? <Check className="h-6 w-6" /> : <step.icon className="h-5 w-5" />}
                                        </span>
                                    </span>
                                    <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-center">
                                        {step.name}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </nav>

                {/* Content */}
                <Card className="border-none shadow-xl">
                    <CardContent className="p-8">
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="entity">Registered Entity Name</Label>
                                        <Input
                                            id="entity"
                                            placeholder="Full Legal Name"
                                            className="h-11"
                                            value={formData.entity_name}
                                            onChange={(e) => updateFormData('entity_name', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg">Business Registration No.</Label>
                                        <Input
                                            id="reg"
                                            placeholder="e.g. REG-12345"
                                            className="h-11"
                                            value={formData.registration_number}
                                            onChange={(e) => updateFormData('registration_number', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Physical Address of establishment</Label>
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
                                        <Label htmlFor="employees">Total Employees</Label>
                                        <Input
                                            id="employees"
                                            type="number"
                                            className="h-11"
                                            value={formData.employees}
                                            onChange={(e) => updateFormData('employees', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Operating Country</Label>
                                        <Select
                                            value={formData.country}
                                            onValueChange={(v) => updateFormData('country', v)}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select Country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ghana">Ghana</SelectItem>
                                                <SelectItem value="nigeria">Nigeria</SelectItem>
                                                <SelectItem value="southafrica">South Africa</SelectItem>
                                                <SelectItem value="kenya">Kenya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="bg-primary/5 p-4 rounded-lg flex gap-3 items-start border border-primary/10">
                                    <Info className="h-5 w-5 text-primary mt-0.5" />
                                    <p className="text-sm text-primary/80">
                                        The scope determines the inspection criteria and technical requirements for your entity.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <Label>Select Certification Category</Label>
                                    {[
                                        "Food Processing / Manufacturing",
                                        "Meat & Poultry Abattoir",
                                        "Hospitality (Hotels & Restaurants)",
                                        "Logistics & Warehousing",
                                        "Pharmaceuticals & Cosmetics"
                                    ].map((cat) => (
                                        <div
                                            key={cat}
                                            className="flex items-center space-x-3 p-3 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group"
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
                                                className="data-[state=checked]:bg-primary"
                                                checked={formData.categories.includes(cat)}
                                            />
                                            <label htmlFor={cat} className="text-sm font-medium leading-none cursor-pointer flex-1">{cat}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Product/Service List</Label>
                                        <Button variant="outline" size="sm" className="text-xs">Add Item +</Button>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Brand</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t">
                                                    <td className="px-4 py-3">Frozen Beef Patties</td>
                                                    <td className="px-4 py-3">Sarah Foods</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="sm" className="text-red-500">Remove</Button>
                                                    </td>
                                                </tr>
                                                <tr className="border-t bg-muted/5">
                                                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground italic">
                                                        Add more products to complete your certification scope.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-4 border rounded-xl p-6 bg-muted/20">
                                    <h3 className="font-bold text-lg font-serif">Legal Declaration</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="dec1"
                                                className="mt-1"
                                                checked={formData.declaration_confirmed}
                                                onCheckedChange={(checked) => updateFormData('declaration_confirmed', checked === true)}
                                            />
                                            <label htmlFor="dec1" className="text-sm leading-relaxed cursor-pointer">
                                                I hereby declare that all information provided in this application is true and correct to the best of my knowledge.
                                            </label>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <Checkbox id="dec2" className="mt-1" defaultChecked />
                                            <label htmlFor="dec2" className="text-sm leading-relaxed cursor-pointer">
                                                I agree to comply with the AHI Halal Standards and allow inspection visits as per the certification procedure.
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Electronic Signature (Full Name)</Label>
                                    <Input
                                        placeholder="Type your full legal name"
                                        className="h-11 font-serif text-lg italic"
                                        value={formData.signature}
                                        onChange={(e) => updateFormData('signature', e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-12 pt-8 border-t">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className="h-11 font-bold group"
                            >
                                <ChevronLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                Previous Step
                            </Button>

                            {currentStep < steps.length ? (
                                <Button
                                    onClick={handleNext}
                                    className="h-11 bg-primary text-white hover:bg-primary/90 font-bold group"
                                >
                                    Continue
                                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    className="h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold px-8 shadow-lg shadow-secondary/20"
                                >
                                    Final Submit & Lock
                                    <Upload className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Governance Note */}
                <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    ⚠️ Notice: Once submitted, applications cannot be edited without formal written request.
                </p>
            </div>
        </ClientLayout>
    );
}
