import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CertificateTemplate } from './CertificateTemplate';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CertificateDownloaderProps {
    certificateId: string;
    certificateNumber: string;
    institutionName: string;
    scope: string;
    location: string;
    issueDate: string;
    expiryDate: string;
    standard?: string;
    variant?: 'outline' | 'default' | 'ghost' | 'secondary';
    className?: string;
    showIcon?: boolean;
    label?: string;
}

export const CertificateDownloader: React.FC<CertificateDownloaderProps> = ({
    certificateId,
    certificateNumber,
    institutionName,
    scope,
    location,
    issueDate,
    expiryDate,
    standard = 'AHI-HALAL-2024',
    variant = 'default',
    className = '',
    showIcon = true,
    label = 'Download Certificate',
}) => {
    const [isGenerating, setIsGenerating] = React.useState(false);
    const { toast } = useToast();
    const templateRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!templateRef.current) return;

        setIsGenerating(true);
        try {
            // Small delay to ensure any fonts/images and styled QR assets are ready.
            await new Promise(resolve => setTimeout(resolve, 900));

            const dataUrl = await toPng(templateRef.current, {
                pixelRatio: 2, // Higher resolution
                quality: 1,
            });

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1131, 800],
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, 1131, 800);
            pdf.save(`Certificate-${certificateNumber}.pdf`);

            toast({
                title: 'Download Successful',
                description: 'Your certificate PDF has been generated and downloaded.',
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'There was an error generating your certificate. Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const verificationUrl = `${window.location.origin}/directory?certificate=${encodeURIComponent(certificateNumber)}`;

    return (
        <>
            <Button
                variant={variant}
                className={className}
                disabled={isGenerating}
                onClick={handleDownload}
            >
                {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    showIcon && <Download className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : label}
            </Button>

            {/* Hidden container for rendering */}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                <div ref={templateRef}>
                    <CertificateTemplate
                        certificateNumber={certificateNumber}
                        institutionName={institutionName}
                        scope={scope}
                        location={location}
                        issueDate={issueDate}
                        expiryDate={expiryDate}
                        standard={standard}
                        qrValue={verificationUrl}
                    />
                </div>
            </div>
        </>
    );
};
