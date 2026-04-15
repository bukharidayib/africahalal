import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import {
  Search,
  QrCode,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  FileCheck,
  Loader2,
  Camera,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { supabase } from "@/integrations/supabase/client";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const idFromQuery = searchParams.get("id");
  const numberFromQuery = searchParams.get("number");

  const [certificateId, setCertificateId] = useState("");
  const [verificationResult, setVerificationResult] = useState<"idle" | "valid" | "invalid" | "searching">("idle");
  const [certificate, setCertificate] = useState<any>(null);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (idFromQuery) {
      handleVerify(idFromQuery, 'id');
    } else if (numberFromQuery) {
      setCertificateId(numberFromQuery);
      handleVerify(numberFromQuery, 'number');
    }
  }, [idFromQuery, numberFromQuery]);

  useEffect(() => {
    if (isScannerActive) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render((decodedText) => {
        try {
          const url = new URL(decodedText);
          const scannedId = url.searchParams.get("id");
          if (scannedId) {
            scanner.clear();
            setIsScannerActive(false);
            handleVerify(scannedId, 'id');
          } else {
            scanner.clear();
            setIsScannerActive(false);
            handleVerify(decodedText, 'id');
          }
        } catch (e) {
          scanner.clear();
          setIsScannerActive(false);
          handleVerify(decodedText, 'id');
        }
      }, (error) => {
        // console.warn(error);
      });

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScannerActive]);

  const handleVerify = async (val?: string, type: 'id' | 'number' = 'number') => {
    const valueToUse = val || certificateId.trim();
    if (!valueToUse) return;

    setVerificationResult("searching");

    try {
      let data: any = null;

      if (type === 'id') {
        const { data: result, error } = await supabase.rpc('verify_certificate_by_id', {
          cert_id: valueToUse
        });
        if (error) throw error;
        data = result && result.length > 0 ? result[0] : null;
      } else {
        const { data: result, error } = await supabase.rpc('verify_certificate_public', {
          cert_number: valueToUse
        });
        if (error) throw error;
        data = result && result.length > 0 ? result[0] : null;
      }

      if (data) {
        setCertificate({
          certificate_number: data.certificate_number,
          status: data.status,
          issue_date: data.issue_date,
          expiry_date: data.expiry_date,
          scope: data.scope,
          organizations: {
            name: data.organization_name,
            registration_number: data.organization_registration_number
          }
        });
        setVerificationResult("valid");
        toast({
          title: "Certificate Verified",
          description: "This is an authentic African Halal certificate.",
        });
      } else {
        setCertificate(null);
        setVerificationResult("invalid");
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationResult("invalid");
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <Layout>
      <SEO
        title="Verify Halal Certificate | African Halal Institute"
        description="Instantly verify the authenticity of any AHI Halal certificate. Enter the certificate number or scan the QR code."
        keywords="verify halal certificate, halal certificate check, AHI certificate verification"
        canonicalPath="/verify"
      />
      <HeroSection
        subtitle="Certificate Verification"
        title="Verify Halal Certificate Authenticity"
        description="Instantly verify the validity of any AHI-issued Halal certificate using the certificate ID or QR code."
        size="md"
        variant="centered"
      />

      {/* Verification Section */}
      <section className="section-padding bg-background">
        <div className="container max-w-2xl">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Search by ID
              </TabsTrigger>
              <TabsTrigger value="qr" className="gap-2">
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search">
              <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle>Enter Certificate ID</CardTitle>
                  <CardDescription>
                    Enter the certificate number found on the Halal certificate (e.g., AHI-CRT-2025-0001)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="AHI-CRT-2025-0001"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="text-lg h-12"
                    />
                    <Button
                      onClick={() => handleVerify()}
                      className="bg-primary h-12 px-8"
                      disabled={verificationResult === "searching"}
                    >
                      {verificationResult === "searching" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr">
              <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle>Scan QR Code</CardTitle>
                  <CardDescription>
                    Point your camera at the QR code on the certificate
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {!isScannerActive ? (
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="aspect-square w-48 rounded-2xl bg-muted/50 flex flex-col items-center justify-center border-2 border-dashed border-primary/20">
                        <Camera className="h-16 w-16 text-primary/30" />
                      </div>
                      <Button
                        onClick={() => setIsScannerActive(true)}
                        className="bg-primary font-bold px-8 h-12"
                      >
                        <Camera className="mr-2 h-5 w-5" />
                        Start Camera Scanner
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div id="qr-reader" className="overflow-hidden rounded-xl border-4 border-primary/10" />
                      <Button
                        variant="outline"
                        onClick={() => setIsScannerActive(false)}
                        className="w-full border-destructive text-destructive hover:bg-destructive/10"
                      >
                        Cancel Scanning
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Verification Result */}
          {verificationResult !== "idle" && verificationResult !== "searching" && (
            <Card className={`mt-8 border-none shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden ${verificationResult === "valid" ? "ring-2 ring-green-500" : "ring-2 ring-destructive"
              }`}>
              <CardContent className="p-0">
                {verificationResult === "valid" && certificate ? (
                  <div className="space-y-0">
                    <div className="bg-green-500 p-6 text-white flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 rounded-full">
                          <CheckCircle2 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Certificate Valid</h3>
                          <p className="text-green-100 text-sm opacity-90">Authenticity confirmed by African Halal Institute</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-green-600 font-bold px-3 py-1">ACTIVE</Badge>
                    </div>

                    <div className="p-8 grid sm:grid-cols-2 gap-8 bg-white">
                      <div className="space-y-6">
                        <div className="flex items-start gap-4">
                          <Building2 className="h-6 w-6 text-primary mt-1" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Certified Entity</p>
                            <p className="text-lg font-bold text-slate-800 leading-tight">
                              {certificate.organizations?.name || "Private Entity"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Reg: {certificate.organizations?.registration_number || "N/A"}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <Shield className="h-6 w-6 text-primary mt-1" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Certification Scope</p>
                            <p className="text-sm font-medium text-slate-700 italic leading-relaxed">
                              "{certificate.scope}"
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 border-l sm:pl-8 border-slate-100">
                        <div className="flex items-start gap-4">
                          <FileCheck className="h-6 w-6 text-primary mt-1" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Certificate No.</p>
                            <p className="text-lg font-mono font-bold text-slate-800">{certificate.certificate_number}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <Calendar className="h-6 w-6 text-primary mt-1" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Validity Period</p>
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-600">Issued: <span className="font-bold">{new Date(certificate.issue_date).toLocaleDateString()}</span></span>
                              <span className="text-sm text-secondary font-bold">Expires: {new Date(certificate.expiry_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setVerificationResult("idle")} className="text-muted-foreground">
                        <RefreshCw className="mr-2 h-4 w-4" /> Verify Another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 flex flex-col items-center text-center space-y-4 bg-destructive/5 text-destructive">
                    <XCircle className="h-20 w-20 opacity-30" />
                    <div>
                      <h3 className="text-2xl font-bold">Verification Failed</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        The certificate ID or QR code provided does not match our official records or has been revoked.
                      </p>
                    </div>
                    <Button onClick={() => setVerificationResult("idle")} variant="outline" className="mt-4 border-destructive text-destructive hover:bg-destructive/10">
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Security Note */}
      <section className="py-12 bg-muted">
        <div className="container max-w-2xl">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="h-10 w-10 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Blockchain-Secured Verification</h3>
                  <p className="text-muted-foreground text-sm">
                    All AHI certificates are secured using blockchain technology, ensuring tamper-proof
                    verification and complete transparency. Each certificate's authenticity can be
                    independently verified through our decentralized verification system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Report Issue */}
      <section className="py-12 bg-background">
        <div className="container max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Suspect a Fraudulent Certificate?</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            If you believe a certificate may be fraudulent, please report it immediately.
          </p>
          <Button variant="outline" asChild>
            <a href="/contact">Report Suspicious Certificate</a>
          </Button>
        </div>
      </section>
    </Layout>
  );
}