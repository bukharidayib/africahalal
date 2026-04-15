import { SEO } from "@/components/SEO";
import {
  FileCheck,
  Search,
  ClipboardCheck,
  BadgeCheck,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const verificationSteps = [
  { icon: FileCheck, title: "Documentation Review", description: "Comprehensive review of all submitted documents and procedures" },
  { icon: Search, title: "Source Verification", description: "Tracing ingredients and materials to their origin" },
  { icon: ClipboardCheck, title: "On-Site Inspection", description: "Physical audit of facilities and processes" },
  { icon: BadgeCheck, title: "Shariah Evaluation", description: "Review by qualified Islamic scholars" },
  { icon: Eye, title: "Continuous Monitoring", description: "Ongoing surveillance and compliance checks" },
];

const standardsCoverage = [
  { category: "Raw Materials", items: ["Animal sourcing", "Ingredient verification", "Supplier audits"] },
  { category: "Processing", items: ["Slaughter procedures", "Cross-contamination controls", "Equipment sanitation"] },
  { category: "Storage", items: ["Segregation protocols", "Cold chain management", "Warehouse standards"] },
  { category: "Distribution", items: ["Transport requirements", "Packaging standards", "Traceability systems"] },
];

const scopeLimitations = [
  { included: true, item: "Restaurants" },
  { included: true, item: "Cafés" },
  { included: true, item: "Abattoirs" },
  { included: true, item: "Meat Processing" },
  { included: true, item: "Hospitality" },
  { included: true, item: "Manufacturing" },
];

const lifecycle = [
  {
    title: "Initial Certification",
    content: "The initial certification process involves a comprehensive assessment of your operations, from raw materials to finished products. This includes documentation review, on-site inspection, and Shariah board evaluation. Initial certificates are valid for one year."
  },
  {
    title: "Surveillance Audits",
    content: "During the certification period, AHI conducts regular surveillance audits to ensure ongoing compliance. These may be announced or unannounced, and focus on maintaining the integrity of certified operations."
  },
  {
    title: "Annual Renewal",
    content: "Certification renewal requires a re-assessment of operations, updated documentation, and confirmation of continued compliance. Renewal applications should be submitted at least 60 days before certificate expiry."
  },
  {
    title: "Scope Changes",
    content: "If your operations change—new products, processes, or facilities—you must notify AHI. Scope extensions or modifications require additional assessment and may incur separate fees."
  },
  {
    title: "Suspension & Withdrawal",
    content: "Non-compliance may result in certificate suspension or withdrawal. AHI maintains a clear process for addressing violations, including corrective action requirements and appeal procedures."
  },
];

export default function Standards() {
  return (
    <Layout>
      <SEO
        title="Halal Certification Standards Zambia — ISO & Shariah Compliance | AHI"
        description="AHI's Halal certification standards and methodology. ISO-aligned, Shariah-compliant processes ensuring food safety and ethical sourcing in Zambia."
        keywords="halal standards zambia, halal methodology, ISO halal compliance, shariah certification standards"
        canonicalPath="/standards"
      />
      {/* Hero */}
      <HeroSection
        subtitle="Standards & Methodology"
        title="Technical Framework for Halal Excellence"
        description="Our rigorous standards and verification methodology ensure the highest levels of Halal compliance across all certified operations."
        size="lg"
      />

      {/* Standards Overview */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="Our Standards"
            title="Halal Standards Overview"
            description="Comprehensive coverage across the entire supply chain."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {standardsCoverage.map((standard) => (
              <Card key={standard.category} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">{standard.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {standard.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Scope */}
      <section className="section-padding bg-muted">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <SectionHeader
                subtitle="Certification Scope"
                title="What We Certify"
                align="left"
              />
              <div className="space-y-3">
                {scopeLimitations.map((item) => (
                  <div key={item.item} className="flex items-center gap-3">
                    {item.included ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={item.included ? "text-foreground" : "text-muted-foreground"}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader>
                  <AlertCircle className="h-8 w-8 text-secondary mb-2" />
                  <CardTitle>Scope Limitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-primary-foreground/90">
                  <p>
                    AHI certification focuses on Halal compliance for tangible products
                    and food service operations. Our scope is limited to areas where
                    Halal principles can be objectively verified through physical inspection
                    and documentation review.
                  </p>
                  <p>
                    For industries outside our scope, we recommend contacting specialized
                    certification bodies or consulting with our team for referrals.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Framework */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
              Our Process
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              Verification Framework
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              A systematic five-step approach to ensure comprehensive Halal verification.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {verificationSteps.map((step, index) => (
              <div
                key={step.title}
                className="relative p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 text-center"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <step.icon className="h-8 w-8 mx-auto mb-3 text-secondary" />
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-primary-foreground/70">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certification Lifecycle */}
      <section className="section-padding bg-background">
        <div className="container max-w-3xl">
          <SectionHeader
            subtitle="Full Cycle"
            title="Certification Lifecycle"
            description="Understanding the complete journey from initial certification through renewal."
          />
          <Accordion type="single" collapsible className="w-full">
            {lifecycle.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-secondary flex-shrink-0" />
                    {item.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pl-8">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Key Principles */}
      <section className="section-padding bg-muted">
        <div className="container max-w-4xl">
          <SectionHeader
            subtitle="Foundation"
            title="Key Certification Principles"
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold text-lg mb-3 text-primary">Objectivity</h3>
              <p className="text-muted-foreground text-sm">
                All assessments are based on documented evidence and objective criteria,
                ensuring consistent and fair certification decisions.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold text-lg mb-3 text-primary">Traceability</h3>
              <p className="text-muted-foreground text-sm">
                Complete documentation trail from raw materials to finished products,
                enabling full supply chain verification.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold text-lg mb-3 text-primary">Competence</h3>
              <p className="text-muted-foreground text-sm">
                All auditors and inspectors maintain relevant qualifications and
                undergo continuous professional development.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold text-lg mb-3 text-primary">Confidentiality</h3>
              <p className="text-muted-foreground text-sm">
                All client information is treated with strict confidentiality,
                protected by robust data security measures.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
