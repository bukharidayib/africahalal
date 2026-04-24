import React from "react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  Award,
  Users,
  Building2,
  Utensils,
  Factory,
  Hotel,
  Coffee,
  Store,
  ChefHat,
  Info,
  ArrowRight,
  FileSearch,
  ClipboardCheck,
  BadgeCheck,
  Eye,
  ChevronDown,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Layout } from "@/components/layout/Layout";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { SEO } from "@/components/SEO";
import { BUSINESS_CATEGORY_FEES } from "@/lib/applicationFees";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  image_url: string;
  published_at: string;
}

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
    description: "Pioneering excellence in Halal certification in Zambia.",
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
  { icon: Utensils, name: "Restaurants & Coffee" },
  { icon: Factory, name: "Abattoirs" },
  { icon: Factory, name: "Meat Processing" },
  { icon: Hotel, name: "Hospitality" },
  { icon: Factory, name: "Manufacturies" },
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
    answer: "The certification process typically takes 5 to 7 days, depending on the completeness of your documentation and the nature of your operation.",
  },
  {
    question: "Is AHI certification internationally recognized?",
    answer: "Yes, AHI certification is recognized by major international Halal accreditation bodies. Our standards align with global Halal requirements, facilitating international trade.",
  },
  {
    question: "What industries can apply for certification?",
    answer: "We certify a wide range of industries including food and beverage, meat processing, pharmaceuticals, cosmetics, hospitality, and logistics. Contact us to discuss your specific sector.",
  },
  {
    question: "How do I verify a certificate's authenticity?",
    answer: "You can verify any AHI certificate using our online verification portal. Simply enter the certificate number or scan the QR code on the certificate to confirm its validity.",
  },
];

const testimonials = [
  {
    quote: "AHI certification opened doors to new markets. Their professional team made the process seamless.",
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
    quote: "Outstanding support throughout the certification journey. AHI truly understands the needs of modern businesses.",
    author: "Ibrahim Mensah",
    company: "Golden Harvest Hotels",
    role: "Managing Director",
  },
];

export default function Index() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchBlogs();
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthenticated(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setIsAuthenticated(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchBlogs = async () => {
    const { data } = await (supabase
      .from('blogs' as any)
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(3) as any);

    if (data) setBlogs(data as BlogPost[]);
  };

  return (
    <Layout>
      <SEO
        title="Halal Certification Zambia — African Halal Institute | AHI"
        description="Africa's trusted Halal certification body in Zambia. ISO-accredited, Shariah-compliant certification for food, meat, hospitality & exports. Apply online today."
        keywords="halal certification zambia, halal food zambia, halal certificate zambia, african halal institute, AHI zambia, halal certification authority zambia, halal certified products zambia"
        canonicalPath="/"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: "African Halal Institute",
            url: "https://africanhalaal.com",
            logo: "https://africanhalaal.com/favicon.png",
            description: "Zambia's leading ISO-accredited Halal certification authority. We certify food, meat processing, hospitality, cosmetics and exports.",
            telephone: "+260972044414",
            email: "info@africanhalaal.com",
            address: { "@type": "PostalAddress", streetAddress: "Matero", addressLocality: "Lusaka", addressCountry: "ZM" },
            areaServed: { "@type": "Country", name: "Zambia" },
            serviceType: "Halal Certification",
            priceRange: "ZMW 2,500+",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(faq => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />
      {/* Hero Section */}
      <section className="relative bg-background overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative py-16 md:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Trusted Halal Certification Authority</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
              Your Partner for{" "}
              <span className="text-primary">Halal Certification</span>{" "}
              in <span className="text-primary">Zambia</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We certify businesses across food, meat processing, hospitality, and more.
              Get internationally recognized Halal certification with integrity and compliance.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" asChild>
                <Link to={isAuthenticated ? "/client/applications/new" : "/auth/signup?redirect=/client/applications/new"}>
                  Apply for Certification
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-border hover:bg-accent" asChild>
                <Link to="/verify">Verify a Certificate</Link>
              </Button>
            </div>

            {/* Trust badges - compact */}
            <div className="flex flex-wrap justify-center gap-6 pt-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">ISO Accredited</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Shariah Compliant</span>
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
            description="Comprehensive Halal certification and support services tailored for Zambian businesses."
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
            description="Hear from businesses that have achieved Halal excellence with AHI."
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

      {/* Blogs Section */}
      {blogs.length > 0 && (
        <section className="section-padding bg-background/50">
          <div className="container">
            <SectionHeader
              subtitle="Latest Updates"
              title="Blogs"
              description="Stay informed with the latest news and articles from the African Halal Institute."
            />
            <div className="grid md:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Card key={blog.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col bg-card/50 backdrop-blur-sm">
                  {blog.image_url ? (
                    <div className="h-52 overflow-hidden relative">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                      <img
                        src={blog.image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="h-52 bg-secondary/10 flex items-center justify-center">
                      <Info className="h-12 w-12 text-secondary/40" />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="text-xs font-medium text-primary mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {new Date(blog.published_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {blog.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow pb-4">
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{blog.excerpt}</p>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto border-t border-border/50">
                    <Button variant="ghost" className="w-full justify-between hover:bg-transparent hover:text-primary px-0 group/btn" asChild>
                      <Link to={`/blog/${blog.slug}`}>
                        <span className="font-semibold">Read Article</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

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
            Join hundreds of businesses in Zambia that trust AHI for their Halal certification needs.
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
