import { Link } from "react-router-dom";
import { ArrowRight, Shield, QrCode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData, createFAQSchema, createBreadcrumbSchema } from "@/components/seo/StructuredData";

const faqs = [
  { question: "How do I verify a Halal certificate from Zambia?", answer: "Visit africanhalaal.com/verify, enter the certificate number printed on the certificate, and click Verify. The system will instantly confirm if the certificate is authentic and active." },
  { question: "Can I scan a QR code to verify?", answer: "Yes. All AHI certificates include a QR code. Use our website's QR scanner or any QR code reader app to scan it and verify the certificate instantly." },
  { question: "What if my certificate verification fails?", answer: "If verification fails, the certificate may be expired, revoked, or fraudulent. Contact AHI at info@africanhalaal.com to report suspicious certificates." },
];

export default function VerifyHalalCertificate() {
  return (
    <Layout>
      <SEOHead
        title="Verify Halal Certificate Online — Check Zambia Halal Status"
        description="Verify any Halal certificate issued by the African Halal Institute. Enter the certificate number or scan the QR code to check authenticity instantly."
        canonical="https://africanhalaal.com/verify-halal-certificate"
        keywords="verify halal certificate zambia, check halal certificate, halal certificate verification, halal status check zambia"
      />
      <StructuredData data={createFAQSchema(faqs)} />
      <StructuredData data={createBreadcrumbSchema([
        { name: "Home", url: "https://africanhalaal.com" },
        { name: "Verify Halal Certificate", url: "https://africanhalaal.com/verify-halal-certificate" },
      ])} />
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "AHI Halal Certificate Verification",
        url: "https://africanhalaal.com/verify",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Instantly verify the authenticity of Halal certificates issued by the African Halal Institute in Zambia.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "ZMW" },
      }} />

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container max-w-4xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Verify Halal Certificate Online
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Check the authenticity of any AHI-issued Halal certificate. Enter the certificate number or scan the QR code for instant verification.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
              <Link to="/verify"><Search className="mr-2 h-5 w-5" /> Verify Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-background">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold mb-8 text-center">How to Verify a Halal Certificate</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-lg border bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Find the Certificate Number</h3>
                <p className="text-muted-foreground">Look for the certificate number on the Halal certificate (format: AHI-CRT-YYYY-XXXX).</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 rounded-lg border bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Enter or Scan</h3>
                <p className="text-muted-foreground">Type the certificate number into our verification portal, or scan the QR code printed on the certificate.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 rounded-lg border bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="font-semibold text-lg mb-1">View Results</h3>
                <p className="text-muted-foreground">Instantly see the certificate status, certified organization, scope, and validity dates.</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-10">
            <Button size="lg" asChild>
              <Link to="/verify">Go to Verification Portal <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-muted">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Certificate Verification FAQs</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="mb-4 p-6 rounded-lg border bg-card">
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
