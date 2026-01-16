import { useState } from "react";
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
  FileCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";

// Mock certificate data
const mockCertificates: Record<string, {
  id: string;
  company: string;
  location: string;
  sector: string;
  scope: string;
  issueDate: string;
  expiryDate: string;
  status: "valid" | "expired" | "suspended";
}> = {
  "AHIS-2023-0001": {
    id: "AHIS-2023-0001",
    company: "Fresh Foods Manufacturing Ltd",
    location: "Johannesburg, South Africa",
    sector: "Food & Beverage",
    scope: "Processed foods, beverages, dairy products",
    issueDate: "2023-03-15",
    expiryDate: "2024-03-14",
    status: "valid"
  },
  "AHIS-2023-0002": {
    id: "AHIS-2023-0002",
    company: "Sahara Halal Meats",
    location: "Nairobi, Kenya",
    sector: "Abattoirs & Meat",
    scope: "Poultry slaughter and processing",
    issueDate: "2023-06-01",
    expiryDate: "2024-05-31",
    status: "valid"
  },
};

export default function Verify() {
  const [certificateId, setCertificateId] = useState("");
  const [verificationResult, setVerificationResult] = useState<"idle" | "valid" | "invalid" | "searching">("idle");
  const [certificate, setCertificate] = useState<typeof mockCertificates[string] | null>(null);

  const handleVerify = () => {
    if (!certificateId.trim()) return;
    
    setVerificationResult("searching");
    
    // Simulate API call
    setTimeout(() => {
      const found = mockCertificates[certificateId.toUpperCase()];
      if (found) {
        setCertificate(found);
        setVerificationResult("valid");
      } else {
        setCertificate(null);
        setVerificationResult("invalid");
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <HeroSection
        subtitle="Certificate Verification"
        title="Verify Halal Certificate Authenticity"
        description="Instantly verify the validity of any AHIS-issued Halal certificate using the certificate ID or QR code."
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
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Enter Certificate ID</CardTitle>
                  <CardDescription>
                    Enter the certificate number found on the Halal certificate (e.g., AHIS-2023-0001)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="AHIS-XXXX-XXXX"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="text-lg"
                    />
                    <Button 
                      onClick={handleVerify} 
                      className="bg-primary"
                      disabled={verificationResult === "searching"}
                    >
                      {verificationResult === "searching" ? "Verifying..." : "Verify"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Try: AHIS-2023-0001 or AHIS-2023-0002 for demo
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Scan QR Code</CardTitle>
                  <CardDescription>
                    Point your camera at the QR code on the certificate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square max-w-xs mx-auto rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center p-8">
                    <QrCode className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground text-center">
                      QR scanning functionality would be available in a production environment
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Verification Result */}
          {verificationResult !== "idle" && verificationResult !== "searching" && (
            <Card className={`mt-8 border-2 ${
              verificationResult === "valid" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"
            }`}>
              <CardContent className="p-6">
                {verificationResult === "valid" && certificate ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-400">Certificate Valid</h3>
                        <p className="text-sm text-green-700 dark:text-green-500">This certificate is authentic and currently active</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Company</p>
                          <p className="font-medium">{certificate.company}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Location</p>
                          <p className="font-medium">{certificate.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Sector</p>
                          <p className="font-medium">{certificate.sector}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Valid Until</p>
                          <p className="font-medium">{new Date(certificate.expiryDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Certification Scope</p>
                      <p className="text-sm">{certificate.scope}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="text-xl font-bold text-red-800 dark:text-red-400">Certificate Not Found</h3>
                      <p className="text-sm text-red-700 dark:text-red-500">
                        The certificate ID entered does not match our records. Please check and try again.
                      </p>
                    </div>
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
                    All AHIS certificates are secured using blockchain technology, ensuring tamper-proof 
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
