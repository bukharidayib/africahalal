import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
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

import halalCertImg from "@/assets/services/halal-certification.jpg";
import auditingImg from "@/assets/services/auditing-inspection.jpg";
import trainingImg from "@/assets/services/training-advisory.jpg";
import digitalImg from "@/assets/services/digital-certification.jpg";

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
    image: halalCertImg
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
    image: auditingImg
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
    image: trainingImg
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
    image: digitalImg
  },
];

const whoWeServe = [
  { icon: Utensils, name: "Food Manufacturers" },
  { icon: Factory, name: "Meat Processors" },
  { icon: Hotel, name: "Hotels & Restaurants" },
];

export default function Services() {
  return (
    <Layout>
      <SEO
        title="Halal Certification Services | African Halal Institute"
        description="Explore AHI's Halal certification services — auditing, inspection, training, advisory, and verification for businesses in Zambia."
        keywords="halal certification services, halal auditing zambia, halal training, halal consulting"
        canonicalPath="/services"
      />
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
                className={`grid lg:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? "lg:flex-row-reverse" : ""
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
                <div className={`aspect-video rounded-2xl overflow-hidden ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={960}
                    height={640}
                  />
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
          <div className="flex flex-wrap justify-center gap-6">
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
