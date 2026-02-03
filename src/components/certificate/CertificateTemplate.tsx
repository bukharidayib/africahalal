import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCheck, Shield } from 'lucide-react';

interface CertificateTemplateProps {
    certificateNumber: string;
    institutionName: string;
    scope: string;
    issueDate: string;
    expiryDate: string;
    standard: string;
    qrValue: string;
}

export const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
    certificateNumber,
    institutionName,
    scope,
    issueDate,
    expiryDate,
    standard,
    qrValue,
}) => {
    return (
        <div
            id="certificate-content"
            className="w-[800px] h-[1131px] bg-white relative overflow-hidden font-serif border-[12px] border-double border-primary/20 p-12 flex flex-col items-center justify-between shadow-2xl"
            style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(26, 71, 42, 0.03) 0%, transparent 70%)',
            }}
        >
            {/* Ornamental Corner Borders */}
            <div className="absolute top-0 left-0 w-32 h-32 border-t-8 border-l-8 border-primary/10 rounded-tl-3xl opacity-50" />
            <div className="absolute top-0 right-0 w-32 h-32 border-t-8 border-r-8 border-primary/10 rounded-tr-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-32 h-32 border-b-8 border-l-8 border-primary/10 rounded-bl-3xl opacity-50" />
            <div className="absolute bottom-0 right-0 w-32 h-32 border-b-8 border-r-8 border-primary/10 rounded-br-3xl opacity-50" />

            {/* Header Section */}
            <div className="text-center space-y-6 flex flex-col items-center w-full z-10 pt-8">
                <div className="flex items-center gap-4 mb-4">
                    <img src="/logo.png" alt="AHI Logo" className="h-24 w-auto object-contain grayscale" onError={(e) => {
                        (e.target as HTMLImageElement).src = '/favicon.png';
                    }} />
                    <div className="h-20 w-px bg-primary/20 mx-2" />
                    <div className="text-left">
                        <h1 className="text-3xl font-bold tracking-tighter text-primary">AFRICAN HALAL</h1>
                        <p className="text-sm font-sans tracking-[0.2em] text-muted-foreground font-semibold">INSTITUTE ZAMBIA</p>
                    </div>
                </div>

                <div className="bg-primary/5 py-1 px-8 rounded-full border border-primary/10">
                    <p className="text-xs font-sans font-bold tracking-[0.3em] text-primary/80 uppercase">Official Halal Certification</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full flex flex-col items-center justify-center text-center space-y-8 px-8 z-10">
                <div className="space-y-2">
                    <p className="text-lg italic text-muted-foreground">This is to certify that</p>
                    <h2 className="text-4xl font-bold text-slate-800 uppercase tracking-tight leading-tight">
                        {institutionName}
                    </h2>
                </div>

                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                <div className="space-y-4 max-w-2xl">
                    <p className="text-base leading-relaxed text-slate-600 font-sans tracking-wide">
                        has been assessed and found to be in compliance with the Sharia and AHI Halal Standards for the following scope:
                    </p>
                    <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 border border-border/50 rounded-full">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Certification Scope</span>
                        </div>
                        <p className="text-xl font-semibold text-primary/90 italic">
                            "{scope}"
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 w-full max-w-xl text-left pt-8">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-sans font-bold text-muted-foreground tracking-widest">Certificate Number</span>
                        <p className="text-lg font-bold font-mono text-slate-800">{certificateNumber}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-sans font-bold text-muted-foreground tracking-widest">Standard Applied</span>
                        <p className="text-lg font-bold text-slate-800">{standard}</p>
                    </div>
                </div>
            </div>

            {/* Footer / Verification Section */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="w-full flex justify-between items-end p-8 pt-4 z-10">
                <div className="space-y-6">
                    <div className="flex gap-12">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Issue Date</span>
                            <p className="text-sm font-bold text-slate-800">{issueDate}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Expiry Date</span>
                            <p className="text-sm font-bold text-primary">{expiryDate}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 py-4 px-6 bg-primary/5 border border-primary/10 rounded-xl max-w-xs">
                        <BadgeCheck className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-xs font-bold text-primary">AUTHORIZED SIGNATORY</p>
                            <p className="text-[10px] text-muted-foreground font-sans">African Halal Certification Board</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white border-4 border-slate-50 rounded-xl shadow-inner">
                        <QRCodeSVG value={qrValue} size={120} />
                    </div>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Shield className="h-3 w-3" />
                        <span className="text-[9px] font-sans font-bold uppercase tracking-tighter">SECURE MULTI-LAYER VERIFICATION</span>
                    </div>
                </div>
            </div>

            {/* Background Seal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
                <BadgeCheck className="w-[500px] h-[500px]" />
            </div>
        </div>
    );
};
