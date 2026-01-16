import { Link } from "react-router-dom";
import { 
  BadgeCheck, 
  ClipboardCheck, 
  Users, 
  Laptop,
  ArrowRight,
  CheckCircle2,
  Utensils,
  Factory,
  Hotel,
  Pill,
  Shirt,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const services = [
  {
    icon: BadgeCheck,
    title: "Halal Certification",
    description: "Comprehensive Halal certification for products, processes, and establishments across various industries.",
    features: [
      "Product certification",
      "Process certification",
      "Establishment certification",
      "Export documentation",
      "International recognition"
    ],
    image: "bg-gradient-to-br from-primary/20 to-primary/5"
  },
  {
    icon: ClipboardCheck,
    title: "Auditing & Inspection",
    description: "Rigorous auditing services to ensure continuous compliance with Halal standards and requirements.",
    features: [
      "Initial assessment audits",
      "Surveillance audits",
      "Unannounced inspections",
      "Supplier audits",
      "Compliance verification"
    ],
    image: "bg-gradient-to-br from-secondary/20 to-secondary/5"
  },
  {
    icon: Users,
    title: "Training & Advisory",
    description: "Expert training programs and consultancy services to build internal Halal compliance capabilities.",
    features: [
      "Halal awareness training",
      "Auditor training programs",
      "Management system implementation",
      "Gap analysis consulting",
      "Continuous improvement support"
    ],
    image: "bg-gradient-to-br from-primary/20 to-secondary/10"
  },
  {
    icon: Laptop,
    title: "Digital Certification System",
    description: "Modern digital platform for certificate management, verification, and compliance tracking.",
    features: [
      "Online application portal",
      "Digital certificate issuance",
      "Real-time verification",
      "Compliance dashboard",
      "Document management"
    ],
    image: "bg-gradient-to-br from-secondary/15 to-primary/10"
  },
];

const whoWeServe = [
  { icon: Utensils, name: "Food Manufacturers" },
  { icon: Factory, name: "Meat Processors" },
  { icon: Hotel, name: "Hotels & Restaurants" },
  { icon: Pill, name: "Pharmaceutical Companies" },
  { icon: Shirt, name: "Cosmetics Brands" },
  { icon: Building2, name: "Logistics Providers" },
];

export default function Services() {
  return (
    <Layout>
      {/* Hero */}
      <HeroSection
        subtitle="Our Services"
        title="Our Expertise, Your Growth"
        description="Comprehensive Halal certification and advisory services designed to elevate your business and open doors to global markets."
        size="lg"
      />

      {/* Services Grid */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="space-y-16">
            {services.map((service, index) => (
              <div
                key={service.title}
                className={`grid lg:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold">{service.title}</h2>
                  </div>
                  <p className="text-muted-foreground text-lg mb-6">{service.description}</p>
                  <ul className="space-y-3 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                    <Link to="/contact">
                      Learn More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className={`${service.image} aspect-video rounded-2xl flex items-center justify-center ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                  <service.icon className="h-24 w-24 text-primary/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="section-padding bg-muted">
        <div className="container">
          <SectionHeader
            subtitle="Our Clients"
            title="Who We Serve"
            description="Providing specialized services across diverse industries."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {whoWeServe.map((client) => (
              <div
                key={client.name}
                className="flex flex-col items-center p-6 rounded-lg bg-card border hover:border-secondary hover:shadow-md transition-all text-center"
              >
                <client.icon className="h-10 w-10 text-primary mb-3" />
                <p className="text-sm font-medium">{client.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Packages */}
      <section className="section-padding bg-background">
        <div className="container max-w-4xl">
          <SectionHeader
            subtitle="Tailored Solutions"
            title="Service Packages"
            description="Flexible options to meet your certification needs."
          />
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Standard</CardTitle>
                <CardDescription>For single-site operations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Initial certification audit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Annual surveillance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Digital certificate
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Directory listing
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link to="/contact">Get Quote</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-2 border-secondary shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>For multi-site operations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Everything in Standard
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Multi-site coverage
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Priority scheduling
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Training session included
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                  <Link to="/contact">Get Quote</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Everything in Professional
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Custom audit schedules
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    Advisory consultations
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Need a Consultation?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Our experts are ready to discuss your specific requirements and recommend the right services for your business.
          </p>
          <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
            <Link to="/contact">
              Schedule Consultation <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
