import { Link } from "react-router-dom";
import { 
  Shield, 
  Award, 
  Users, 
  Building2, 
  Utensils, 
  Factory, 
  Hotel,
  Pill,
  Shirt,
  Check,
  ArrowRight,
  FileSearch,
  ClipboardCheck,
  BadgeCheck,
  Eye,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Layout } from "@/components/layout/Layout";
import { SectionHeader } from "@/components/sections/SectionHeader";

const coreValues = [
  {
    icon: Shield,
    title: "Integrity",
    description: "Unwavering commitment to ethical standards and transparent practices in all our certifications.",
  },
  {
    icon: Award,
    title: "Compliance",
    description: "Rigorous adherence to international Halal standards and Shariah principles.",
  },
  {
    icon: Users,
    title: "Leadership",
    description: "Pioneering excellence in Halal certification across the African continent.",
  },
];

const services = [
  {
    icon: BadgeCheck,
    title: "Halal Certification",
    description: "Comprehensive certification for products, processes, and establishments.",
  },
  {
    icon: ClipboardCheck,
    title: "Auditing & Inspection",
    description: "Thorough audits ensuring continuous compliance with Halal standards.",
  },
  {
    icon: Users,
    title: "Training & Advisory",
    description: "Expert guidance and training programs for Halal compliance.",
  },
  {
    icon: FileSearch,
    title: "Verification Services",
    description: "Instant certificate verification through our digital platform.",
  },
];

const industries = [
  { icon: Utensils, name: "Food & Beverage" },
  { icon: Factory, name: "Meat Processing" },
  { icon: Hotel, name: "Hospitality" },
  { icon: Pill, name: "Pharmaceuticals" },
  { icon: Shirt, name: "Cosmetics" },
  { icon: Building2, name: "Logistics" },
];

const journeySteps = [
  { step: 1, title: "Application", description: "Submit your certification application" },
  { step: 2, title: "Documentation", description: "Provide required documents for review" },
  { step: 3, title: "Inspection", description: "On-site audit by certified inspectors" },
  { step: 4, title: "Review", description: "Shariah board evaluation" },
  { step: 5, title: "Certification", description: "Receive your Halal certificate" },
  { step: 6, title: "Surveillance", description: "Ongoing compliance monitoring" },
];

const faqs = [
  {
    question: "What is Halal certification?",
    answer: "Halal certification is a process that verifies products, services, or establishments comply with Islamic dietary and ethical standards. It ensures that items are permissible for consumption or use by Muslims according to Shariah law.",
  },
  {
    question: "How long does the certification process take?",
    answer: "The certification timeline varies based on the complexity of your operation. Typically, it ranges from 4-12 weeks, including documentation review, on-site inspection, and Shariah board evaluation.",
  },
  {
    question: "Is AHIS certification internationally recognized?",
    answer: "Yes, AHIS certification is recognized across Africa and by major international Halal accreditation bodies. Our standards align with global Halal requirements, facilitating international trade.",
  },
  {
    question: "What industries can apply for certification?",
    answer: "We certify a wide range of industries including food and beverage, meat processing, pharmaceuticals, cosmetics, hospitality, and logistics. Contact us to discuss your specific sector.",
  },
  {
    question: "How do I verify a certificate's authenticity?",
    answer: "You can verify any AHIS certificate using our online verification portal. Simply enter the certificate number or scan the QR code on the certificate to confirm its validity.",
  },
];

const testimonials = [
  {
    quote: "AHIS certification opened doors to new markets across Africa. Their professional team made the process seamless.",
    author: "Ahmed Hassan",
    company: "Fresh Foods Ltd",
    role: "CEO",
  },
  {
    quote: "The thorough audit process gave us confidence in our Halal compliance. Highly recommended for any serious business.",
    author: "Fatima Okonkwo",
    company: "Sahara Meats",
    role: "Operations Director",
  },
  {
    quote: "Outstanding support throughout the certification journey. AHIS truly understands the needs of African businesses.",
    author: "Ibrahim Mensah",
    company: "Golden Harvest Hotels",
    role: "Managing Director",
  },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-background overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative py-20 md:py-32 lg:py-40">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">African Halal Institute</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
                Setting the Standard for{" "}
                <span className="text-primary">Halal Excellence</span>{" "}
                <span className="text-secondary">in Africa</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Trusted certification authority ensuring integrity, compliance, and leadership 
                in Halal standards across the continent.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Start Certification
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="border-border hover:bg-accent" asChild>
                  <Link to="/verify">Verify Certificate</Link>
                </Button>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap gap-8 pt-6 border-t border-border">
                <div>
                  <p className="text-3xl font-bold text-foreground">500+</p>
                  <p className="text-sm text-muted-foreground">Certified Businesses</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">15+</p>
                  <p className="text-sm text-muted-foreground">African Countries</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">10+</p>
                  <p className="text-sm text-muted-foreground">Years of Excellence</p>
                </div>
              </div>
            </div>
            
            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-square">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 rounded-3xl" />
                <div className="absolute inset-4 bg-card rounded-2xl shadow-2xl border flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6">
                      <BadgeCheck className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Halal Certified</h3>
                    <p className="text-muted-foreground text-sm">Trusted by businesses across Africa</p>
                  </div>
                </div>
                {/* Floating badges */}
                <div className="absolute -left-4 top-1/4 bg-card rounded-xl shadow-lg border p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">ISO Accredited</p>
                      <p className="text-xs text-muted-foreground">International Standards</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 bottom-1/4 bg-card rounded-xl shadow-lg border p-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Award className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Shariah Compliant</p>
                      <p className="text-xs text-muted-foreground">Verified by Scholars</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Core */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="Our Foundation"
            title="Institutional Core"
            description="Built on principles that ensure trust, excellence, and unwavering commitment to Halal integrity."
          />
          <div className="grid md:grid-cols-3 gap-8">
            {coreValues.map((value) => (
              <Card key={value.title} className="text-center border-none shadow-lg">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-muted">
        <div className="container">
          <SectionHeader
            subtitle="What We Offer"
            title="Institutional Services"
            description="Comprehensive Halal certification and support services tailored for African businesses."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Card key={service.title} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <service.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link to="/services">
                View All Services <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trusted Partner - Industries */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="Your Trusted Partner"
            title="Industries We Certify"
            description="Serving diverse sectors with specialized Halal certification expertise."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="flex flex-col items-center p-6 rounded-lg bg-card border hover:border-secondary hover:shadow-md transition-all"
              >
                <industry.icon className="h-10 w-10 text-primary mb-3" />
                <p className="text-sm font-medium text-center">{industry.name}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link to="/industries">
                Explore Industries <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Certification Journey */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
              The Process
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              Your Certification Journey
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              A streamlined six-step process designed for efficiency and transparency.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeySteps.map((step) => (
              <div
                key={step.step}
                className="flex items-start gap-4 p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-primary-foreground/70">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
              <Link to="/certification-journey">
                Learn More <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-muted">
        <div className="container">
          <SectionHeader
            subtitle="Success Stories"
            title="What Our Clients Say"
            description="Hear from businesses that have achieved Halal excellence with AHIS."
          />
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="border-none shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Award key={i} className="h-5 w-5 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <blockquote className="text-foreground mb-4 italic">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section-padding bg-background">
        <div className="container max-w-3xl">
          <SectionHeader
            subtitle="Got Questions?"
            title="Frequently Asked Questions"
            description="Find answers to common questions about Halal certification."
          />
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-secondary-foreground mb-4">
            Ready to Get Certified?
          </h2>
          <p className="text-secondary-foreground/80 mb-8 max-w-xl mx-auto">
            Join hundreds of businesses across Africa that trust AHIS for their Halal certification needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link to="/contact">Apply Now</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
