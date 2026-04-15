import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import {
  FileText,
  FolderOpen,
  Search,
  ClipboardCheck,
  BadgeCheck,
  Eye,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const journeySteps = [
  {
    step: 1,
    icon: FileText,
    title: "Application",
    description: "Submit your certification application through our online portal or contact our team directly.",
    duration: "1-2 days",
    milestones: [
      "Complete application form",
      "Pay application fee",
      "Receive application confirmation",
      "Assigned certification coordinator"
    ]
  },
  {
    step: 2,
    icon: FolderOpen,
    title: "Documentation Review",
    description: "Our team reviews your submitted documents to assess readiness for inspection.",
    duration: "5-10 days",
    milestones: [
      "Submit required documents",
      "Document completeness check",
      "Preliminary compliance review",
      "Request for clarifications (if needed)"
    ]
  },
  {
    step: 3,
    icon: Search,
    title: "On-Site Inspection",
    description: "Certified auditors conduct a comprehensive inspection of your facilities and processes.",
    duration: "1-3 days",
    milestones: [
      "Schedule inspection date",
      "Opening meeting",
      "Facility and process audit",
      "Closing meeting with findings"
    ]
  },
  {
    step: 4,
    icon: ClipboardCheck,
    title: "Shariah Review",
    description: "Our Shariah Supervisory Board evaluates the inspection findings for compliance.",
    duration: "5-7 days",
    milestones: [
      "Audit report submitted to board",
      "Shariah compliance evaluation",
      "Certification decision",
      "Notification of outcome"
    ]
  },
  {
    step: 5,
    icon: BadgeCheck,
    title: "Certificate Issuance",
    description: "Upon approval, receive your official AHI Halal certificate.",
    duration: "2-3 days",
    milestones: [
      "Certificate preparation",
      "Digital certificate issued",
      "Physical certificate dispatched",
      "Directory listing activated"
    ]
  },
  {
    step: 6,
    icon: Eye,
    title: "Surveillance & Renewal",
    description: "Ongoing monitoring ensures continued compliance throughout the certification period.",
    duration: "Ongoing",
    milestones: [
      "Regular surveillance audits",
      "Compliance monitoring",
      "Renewal notification (60 days prior)",
      "Annual recertification"
    ]
  },
];

const quickFacts = [
  { icon: Clock, label: "Average Timeline", value: "4-8 weeks" },
  { icon: DollarSign, label: "Starting From", value: "Contact Us" },
  { icon: Users, label: "Expert Auditors", value: "50+" },
  { icon: BadgeCheck, label: "Success Rate", value: "95%" },
];

export default function CertificationJourney() {
  return (
    <Layout>
      <SEO
        title="How to Get Halal Certified in Zambia — Step-by-Step Process | AHI"
        description="7-step Halal certification process in Zambia. From application to certificate in 5-7 days. Start your certification journey with AHI today."
        keywords="how to get halal certified, halal certification process zambia, halal certification steps"
        canonicalPath="/certification-journey"
      />
      {/* Hero */}
      <HeroSection
        subtitle="Certification Journey"
        title="Your Path to Halal Certification"
        description="A transparent, step-by-step process designed to guide you from application to certification with clarity and support."
        size="lg"
      >
        <div className="flex flex-wrap gap-6 mt-8">
          {quickFacts.map((fact) => (
            <div key={fact.label} className="flex items-center gap-3 bg-primary-foreground/10 rounded-lg px-4 py-2">
              <fact.icon className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-xs text-primary-foreground/70">{fact.label}</p>
                <p className="font-semibold">{fact.value}</p>
              </div>
            </div>
          ))}
        </div>
      </HeroSection>

      {/* Journey Steps */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="The Process"
            title="Six Steps to Certification"
            description="Each step is designed for transparency and efficiency."
          />

          <div className="space-y-8">
            {journeySteps.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Connection Line */}
                {index < journeySteps.length - 1 && (
                  <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-border hidden md:block" />
                )}

                <Card className="border-none shadow-lg overflow-hidden">
                  <div className="grid md:grid-cols-3">
                    {/* Step Header */}
                    <div className="bg-primary text-primary-foreground p-6 md:p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold text-xl">
                          {step.step}
                        </div>
                        <step.icon className="h-8 w-8 text-secondary" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-primary-foreground/80 text-sm mb-4">{step.description}</p>
                      <div className="flex items-center gap-2 text-secondary">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{step.duration}</span>
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="md:col-span-2 p-6 md:p-8">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
                        Key Milestones
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {step.milestones.map((milestone, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                            <span className="text-sm">{milestone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="section-padding bg-muted">
        <div className="container max-w-4xl">
          <SectionHeader
            subtitle="Be Prepared"
            title="What You'll Need"
            description="Gather these items before starting your application."
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Business registration documents
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Product/ingredient lists
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Processing flowcharts
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Supplier Halal certificates
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    HACCP/food safety documents
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Facility Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Dedicated Halal production areas
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Proper storage segregation
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Cleaning protocols in place
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Trained personnel
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    Traceability systems
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-secondary">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-secondary-foreground mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-secondary-foreground/80 mb-8 max-w-xl mx-auto">
            Our certification team is ready to guide you through every step of the process.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link to="/contact">
                Start Application <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <Link to="/services">View Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
