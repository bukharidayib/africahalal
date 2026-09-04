import React from 'react';
import { BadgeCheck, Shield } from 'lucide-react';
import { BrandedQRCode } from './BrandedQRCode';

interface CertificateTemplateProps {
    certificateNumber: string;
    institutionName: string;
    scope: string;
    location: string;
    issueDate: string;
    expiryDate: string;
    standard: string;
    qrValue: string;
}

export const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
    certificateNumber,
    institutionName,
    scope,
    location,
    issueDate,
    expiryDate,
    standard,
    qrValue,
}) => {
    return (
        <div
            id="certificate-content"
            className="w-[1131px] h-[800px] bg-white relative overflow-hidden font-serif border-[14px] border-double border-primary/30 px-12 pb-12 pt-6 flex flex-col shadow-2xl"
            style={{
                backgroundImage: 'radial-gradient(circle at 50% 45%, rgba(31, 96, 70, 0.08) 0%, rgba(31, 96, 70, 0.02) 42%, transparent 70%)',
            }}
        >
            <img
                src="/halaal-logo.png"
                alt=""
                className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.055]"
            />
            <img
                src="/halaal-logo.png"
                alt=""
                className="absolute -right-16 -top-20 h-72 w-72 object-contain opacity-[0.08]"
            />

            <div className="absolute inset-5 border border-primary/20" />
            <div className="absolute left-8 top-8 h-28 w-28 border-l-[10px] border-t-[10px] border-primary/25" />
            <div className="absolute right-8 top-8 h-28 w-28 border-r-[10px] border-t-[10px] border-primary/25" />
            <div className="absolute bottom-8 left-8 h-28 w-28 border-b-[10px] border-l-[10px] border-primary/25" />
            <div className="absolute bottom-8 right-8 h-28 w-28 border-b-[10px] border-r-[10px] border-primary/25" />

            <div className="relative z-10 grid min-h-[165px] grid-cols-[270px_1fr_220px] items-center gap-8">
                <div className="flex justify-start">
                    <img src="/halaal-logo.png" alt="African Halal Institute" className="h-56 w-56 object-contain" />
                </div>
                <div className="text-center">
                    <h1 className="text-5xl font-black leading-none text-primary uppercase tracking-normal">
                        African Halal Institute
                    </h1>
                    <p className="mt-2 whitespace-nowrap font-sans text-sm font-bold uppercase tracking-[0.22em] text-secondary">
                        INDEPENDENT HALAL CERTIFICATION BODY
                    </p>
                </div>
                <div className="text-right font-sans">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Certificate No.</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{certificateNumber}</p>
                </div>
            </div>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center px-14 py-1">
                <p className="font-sans text-base font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    This certificate is proudly issued to
                </p>
                <div className="mt-3 w-full border-y-4 border-primary/20 py-4">
                    <h2 className="text-6xl font-black uppercase leading-[0.95] text-slate-900 tracking-normal">
                        {institutionName}
                    </h2>
                </div>

                <div className="relative mt-4 flex w-full flex-col items-center">
                    <div className="relative z-10 max-w-4xl font-sans text-base font-semibold leading-relaxed text-slate-700">
                        Has been assessed and found to comply with Sharia Principles and AHI Halal<br />
                        Standards requirments for Certification Scope: {scope}
                    </div>
                </div>
                <div className="relative z-10 mt-3 min-w-[320px] max-w-[480px] bg-primary px-6 py-2.5 text-white shadow-lg">
                    <p className="font-sans text-[9px] font-black uppercase tracking-[0.24em] text-white/70">Location</p>
                    <p className="mt-1 text-xl font-black uppercase leading-none tracking-normal">
                        {location}
                    </p>
                </div>
            </div>

            <div className="relative z-10 grid min-h-[180px] grid-cols-[1fr_auto_1fr] items-center gap-8 border-t-4 border-primary/25 bg-white/85 px-4 pt-4">
                <div className="absolute -left-4 -top-[136px] z-20 h-40 w-40 drop-shadow-[0_5px_8px_rgba(15,23,42,0.18)]">
                    <img
                        src="/AHI-Stamp2.png"
                        alt="African Halal Institute official seal"
                        className="h-full w-full object-contain"
                    />
                </div>

                <div className="space-y-4 font-sans">
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Issue Date</p>
                            <p className="mt-1 text-lg font-black text-slate-900">{issueDate}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Expiry Date</p>
                            <p className="mt-1 text-lg font-black text-primary">{expiryDate}</p>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-4 border-2 border-primary/25 bg-primary/10 px-6 py-4 shadow-sm">
                        <BadgeCheck className="h-10 w-10 text-primary" />
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">Authorized Certification</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">African Halal Institute Board</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-2 shadow-md">
                        <BrandedQRCode value={qrValue} size={126} />
                    </div>
                    <div className="flex items-center gap-1.5 font-sans text-[9px] font-black uppercase tracking-tight text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        Scan to verify
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3 text-right font-sans">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Validation</p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                            Valid only while listed as active in the African Halal Institute public registry.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
