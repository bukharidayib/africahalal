import { useState, useRef } from "react";
import { Upload, FileText, Check, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MandatoryDocument {
    id: string;
    name: string;
    description: string;
    required: boolean;
    acceptedFormats: string[];
}

const mandatoryDocuments: MandatoryDocument[] = [
    {
        id: "business_registration",
        name: "Business Registration Certificate (PACRA)",
        description: "Official certificate of company registration",
        required: true,
        acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"]
    },
    {
        id: "tax_clearance",
        name: "TPIN/Tax Clearance Certificate",
        description: "Valid tax registration or clearance document",
        required: true,
        acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"]
    },
    {
        id: "ingredient_spec",
        name: "Ingredient Technical Specification Sheet",
        description: "Detailed specifications for all ingredients used",
        required: true,
        acceptedFormats: [".pdf", ".xlsx", ".xls", ".doc", ".docx"]
    },
    {
        id: "halal_policy",
        name: "Halal Policy Statement",
        description: "Company's halal compliance policy document",
        required: false,
        acceptedFormats: [".pdf", ".doc", ".docx"]
    },
    {
        id: "process_flow",
        name: "Process Flow Diagrams",
        description: "Visual representation of production processes",
        required: false,
        acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"]
    },
    {
        id: "supplier_certificates",
        name: "Supplier Halal Certificates",
        description: "Halal certificates from ingredient suppliers",
        required: false,
        acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"]
    }
];

interface UploadedFile {
    documentId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
}

interface MandatoryDocumentsProps {
    applicationId: string | null;
    uploadedFiles: UploadedFile[];
    onUpload: (file: UploadedFile) => void;
    onRemove: (documentId: string) => void;
}

export function MandatoryDocuments({
    applicationId,
    uploadedFiles,
    onUpload,
    onRemove
}: MandatoryDocumentsProps) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFileSelect = async (documentId: string, file: File) => {
        if (!file) return;

        const doc = mandatoryDocuments.find(d => d.id === documentId);
        if (!doc) return;

        // Validate file type
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!doc.acceptedFormats.includes(fileExt)) {
            toast({
                variant: "destructive",
                title: "Invalid File Type",
                description: `Accepted formats: ${doc.acceptedFormats.join(', ')}`
            });
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "File Too Large",
                description: "Maximum file size is 10MB"
            });
            return;
        }

        setUploading(documentId);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Generate unique file path
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${user.id}/${documentId}/${timestamp}_${safeName}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('application-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const uploadedFile: UploadedFile = {
                documentId,
                fileName: file.name,
                filePath,
                fileSize: file.size
            };

            onUpload(uploadedFile);

            toast({
                title: "Document Uploaded",
                description: `${doc.name} has been uploaded successfully.`
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message || "Failed to upload document"
            });
        } finally {
            setUploading(null);
        }
    };

    const handleRemove = async (documentId: string) => {
        const uploadedFile = uploadedFiles.find(f => f.documentId === documentId);
        if (!uploadedFile) return;

        try {
            await supabase.storage
                .from('application-documents')
                .remove([uploadedFile.filePath]);

            onRemove(documentId);

            toast({
                title: "Document Removed",
                description: "The document has been removed."
            });
        } catch (error) {
            console.error('Remove error:', error);
        }
    };

    const getFileForDocument = (documentId: string) => {
        return uploadedFiles.find(f => f.documentId === documentId);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const requiredDocs = mandatoryDocuments.filter(d => d.required);
    const optionalDocs = mandatoryDocuments.filter(d => !d.required);
    const uploadedRequiredCount = requiredDocs.filter(d => getFileForDocument(d.id)).length;

    return (
        <div className="space-y-6">
            {/* Progress indicator */}
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Required Documents Progress</span>
                    <span className="text-sm text-muted-foreground">
                        {uploadedRequiredCount} of {requiredDocs.length} uploaded
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(uploadedRequiredCount / requiredDocs.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Required Documents */}
            <div>
                <Label className="text-base flex items-center gap-2 mb-4">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Required Documents
                </Label>
                <div className="space-y-3">
                    {requiredDocs.map((doc) => {
                        const uploadedFile = getFileForDocument(doc.id);
                        const isUploading = uploading === doc.id;

                        return (
                            <div
                                key={doc.id}
                                className={`border rounded-lg p-4 transition-colors ${
                                    uploadedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">{doc.name}</span>
                                            <Badge variant="destructive" className="text-[10px]">Required</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                                        {uploadedFile && (
                                            <div className="flex items-center gap-2 mt-2 text-sm text-green-700 dark:text-green-400">
                                                <FileText className="h-4 w-4" />
                                                <span>{uploadedFile.fileName}</span>
                                                <span className="text-muted-foreground">({formatFileSize(uploadedFile.fileSize)})</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {uploadedFile ? (
                                            <>
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                    <Check className="h-4 w-4 text-white" />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemove(doc.id)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isUploading}
                                                onClick={() => fileInputRefs.current[doc.id]?.click()}
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Upload
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        <input
                                            ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                                            type="file"
                                            accept={doc.acceptedFormats.join(',')}
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(doc.id, file);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Optional Documents */}
            <div>
                <Label className="text-base mb-4 block">Optional Documents</Label>
                <div className="space-y-3">
                    {optionalDocs.map((doc) => {
                        const uploadedFile = getFileForDocument(doc.id);
                        const isUploading = uploading === doc.id;

                        return (
                            <div
                                key={doc.id}
                                className={`border rounded-lg p-4 transition-colors ${
                                    uploadedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">{doc.name}</span>
                                            <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                                        {uploadedFile && (
                                            <div className="flex items-center gap-2 mt-2 text-sm text-green-700 dark:text-green-400">
                                                <FileText className="h-4 w-4" />
                                                <span>{uploadedFile.fileName}</span>
                                                <span className="text-muted-foreground">({formatFileSize(uploadedFile.fileSize)})</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {uploadedFile ? (
                                            <>
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                    <Check className="h-4 w-4 text-white" />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemove(doc.id)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isUploading}
                                                onClick={() => fileInputRefs.current[doc.id]?.click()}
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Upload
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        <input
                                            ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                                            type="file"
                                            accept={doc.acceptedFormats.join(',')}
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(doc.id, file);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
