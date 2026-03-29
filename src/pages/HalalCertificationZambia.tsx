import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Shield, Award, Clock, FileCheck, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Layout } from "@/components/layout/Layout";

const faqs = [
  {
    question: "What is the cost of Halal certification in Zambia?",
    answer: "Halal certification costs in Zambia vary based on business size, type, and scope. Application fees start from ZMW 2,500. Contact the African Halal Institute for a detailed quote tailored to your business.",
  },
  {
    question: "How long does the Halal certification process take in Zambia?",
    answer: "The certification process typically takes 4-12 weeks depending on your business complexity, documentation readiness, and inspection scheduling. Simpler operations like restaurants may be certified faster.",
  },
  {
    question: "What are the requirements for Halal certification in Zambia?",
    answer: "Requirements include: a completed application form, business registration (PACRA), ingredient lists and sourcing documentation, facility layout plans, standard operating procedures, and a commitment to ongoing compliance monitoring.",
  },
  {
    question: "Is AHI Halal certification recognized internationally?",
    answer: "Yes, the African Halal Institute's certification is aligned with international Halal standards and recognized by major accreditation bodies, facilitating export to OIC member countries and global Halal markets.",
  },
  {
    question: "Can restaurants and small businesses get Halal certified in Zambia?",
    answer: "Absolutely. AHI certifies businesses of all sizes including restaurants, cafes, butcheries, food manufacturers, hotels, and catering services throughout Zambia.",
  },
  {
    question: "How do I verify a Halal certificate in Zambia?",
    answer: "You can verify any AHI-issued certificate instantly on our website at africanhalaal.com/verify by entering the certificate number or scanning the QR code printed on the certificate.",
  },
];

const steps = [
  { icon: FileCheck, title: "Submit Application", description: "Complete the online application form with your business details and required documentation." },
  { icon: Shield, title: "Document Review", description: "Our compliance team reviews your ingredient lists, processes, and facility documentation." },
  { icon: Users, title: "On-Site Inspection", description: "Certified inspectors visit your facility to verify Halal compliance first-hand." },
  { icon: Award, title: "Shariah Board Review", description: "The Shariah Advisory Board evaluates findings and makes the certification decision." },
  { icon: CheckCircle, title: "Certification Issued", description: "Upon approval, receive your official AHI Halal certificate with a unique verifiable QR code." },
  { icon: Clock, title: "Ongoing Surveillance", description: "Regular audits ensure continued compliance throughout the certificate validity period." },
];

const benefits = [
  "Access the $2.5 trillion global Halal market",
  "Build consumer trust and brand credibility",
  "Meet export requirements for OIC countries",
  "Differentiate your business in the Zambian market",
  "Attract the growing Muslim consumer demographic",
  "Demonstrate commitment to quality and ethical standards",
];

export default function HalalCertificationZambia() {
  return (
    <Layout>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container max-w-4xl text-center space-y-6">
          <p className="text-secondary font-medium uppercase tracking-wider text-sm">Trusted Certification Authority</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Halal Certification in Zambia
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            The African Halal Institute is Zambia's leading Halal certification body. We certify restaurants, manufacturers, exporters, and hospitality businesses with internationally recognized standards.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
              <Link to="/auth/signup">Apply for Certification <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Get Certified */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-secondary font-medium uppercase tracking-wider text-sm mb-2">Why Get Certified</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Benefits of Halal Certification in Zambia</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Halal certification opens doors to new markets, builds consumer trust, and positions your business for growth.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-foreground font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certification Process */}
      <section className="section-padding bg-muted">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-secondary font-medium uppercase tracking-wider text-sm mb-2">The Process</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How to Get Halal Certification in Zambia</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Our streamlined six-step process ensures efficient and transparent certification.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <Card key={step.title} className="border-none shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {i + 1}
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" asChild>
              <Link to="/certification-journey">View Detailed Process <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Industries We Certify */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Industries We Certify in Zambia</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From restaurants in Lusaka to meat processing plants across the country, we serve all sectors.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Restaurants & Cafes", "Meat Processing & Abattoirs", "Hotels & Hospitality", "Food Manufacturing", "Catering Services", "Suppliers & Distributors", "Cosmetics & Pharmaceuticals", "Export Companies"].map((industry) => (
              <div key={industry} className="flex items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium">{industry}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link to="/industries">View All Industries <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-muted" id="faq">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Halal Certification FAQs — Zambia</h2>
            <p className="text-muted-foreground">Common questions about getting Halal certified in Zambia.</p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-lg border px-6">
                <AccordionTrigger className="text-left font-semibold">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Halal Certified in Zambia?</h2>
          <p className="text-primary-foreground/80 mb-8">Join hundreds of Zambian businesses that trust AHI for their Halal certification. Start your application today.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
              <Link to="/auth/signup">Start Application <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/verify">Verify a Certificate</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
