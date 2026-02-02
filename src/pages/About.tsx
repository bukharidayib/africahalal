import { Link } from "react-router-dom";
import {
  Shield,
  Award,
  Eye,
  Globe,
  Target,
  Lightbulb,
  Users,
  Building2,
  Utensils,
  Factory,
  Hotel,
  Pill,
  Shirt,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const stats = [
  { value: "500+", label: "Certified Businesses" },
  { value: "Zambia", label: "Primary Focus" },
  { value: "10+", label: "Years of Excellence" },
  { value: "50+", label: "Expert Auditors" },
];

const sectors = [
  { icon: Utensils, title: "Food Manufacturers", description: "Processed foods, beverages, and ingredients" },
  { icon: Factory, title: "Abattoirs & Processors", description: "Meat slaughter and processing facilities" },
  { icon: Hotel, title: "Hospitality Sector", description: "Hotels, restaurants, and catering services" },
  { icon: Pill, title: "Pharmaceuticals", description: "Medicines and healthcare products" },
  { icon: Shirt, title: "Cosmetics & Personal Care", description: "Beauty and personal care products" },
  { icon: Building2, title: "Logistics & Storage", description: "Cold chain and warehousing facilities" },
];

const timeline = [
  { year: "2012", title: "Foundation", description: "AHI established with a focus on Halal excellence" },
  { year: "2014", title: "Regional Growth", description: "Expanding our certification methodology" },
  { year: "2016", title: "International Recognition", description: "Achieved international accreditation" },
  { year: "2018", title: "Digital Transformation", description: "Launched online verification platform" },
  { year: "2020", title: "Zambia Operations", description: "Concentrated operations in Zambia" },
  { year: "2023", title: "Innovation Leadership", description: "Blockchain-based certificate verification" },
];

const coreValues = [
  { icon: Shield, title: "Integrity", description: "Upholding the highest ethical standards in every certification decision" },
  { icon: Award, title: "Excellence", description: "Striving for perfection in our processes and service delivery" },
  { icon: Eye, title: "Transparency", description: "Open and honest communication with all stakeholders" },
  { icon: Globe, title: "Pan-Africanism", description: "Committed to African unity and continental development" },
];

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <HeroSection
        subtitle="About AHI"
        title="Pioneering Halal Excellence Across Africa"
        description="The African Halal Institute sets the benchmark for Halal certification, combining rigorous Shariah compliance with modern certification practices."
        size="lg"
      />

      {/* Beyond Boundaries */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
                Our Reach
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
                Beyond Boundaries
              </h2>
              <p className="text-muted-foreground mb-6 text-lg">
                From humble beginnings, AHI has grown to become the leading
                Halal certification authority in Zambia. Our commitment to
                excellence and integrity has earned us trust from businesses and consumers alike.
              </p>
              <p className="text-muted-foreground mb-8">
                We understand the unique challenges and opportunities in the Zambian market, combining
                international best practices with local expertise to deliver certification services
                that truly serve our communities.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
                <Globe className="h-32 w-32 text-primary/50" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-secondary rounded-lg p-4 shadow-lg">
                <p className="text-2xl font-bold text-secondary-foreground">Zambia</p>
                <p className="text-sm text-secondary-foreground/80">Regional Hub</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="section-padding bg-muted">
        <div className="container">
          <SectionHeader
            subtitle="Our Clients"
            title="Who We Serve"
            description="Providing specialized certification services across diverse industries."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectors.map((sector) => (
              <Card key={sector.title} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <sector.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{sector.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{sector.description}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Authority */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
              Our Authority
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
              Institutional Authority & Compliance
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              AHI operates under strict governance frameworks, ensuring every certification
              decision is made with integrity and in accordance with international Halal standards.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                <CheckCircle className="h-8 w-8 text-secondary mx-auto mb-3" />
                <p className="font-semibold">Shariah Compliance</p>
              </div>
              <div className="p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                <CheckCircle className="h-8 w-8 text-secondary mx-auto mb-3" />
                <p className="font-semibold">ISO Accredited</p>
              </div>
              <div className="p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                <CheckCircle className="h-8 w-8 text-secondary mx-auto mb-3" />
                <p className="font-semibold">International Recognition</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="Our History"
            title="Our Journey Through Time"
            description="A decade of growth, innovation, and commitment to Halal excellence."
          />
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-1/2" />
            {timeline.map((item, index) => (
              <div
                key={item.year}
                className={`relative flex items-start gap-8 mb-8 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : ""} hidden md:block`}>
                  <div className={`p-4 ${index % 2 === 0 ? "md:pr-8" : "md:pl-8"}`}>
                    <p className="text-sm text-secondary font-medium">{item.year}</p>
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </div>
                <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 md:hidden">
                  <p className="text-sm text-secondary font-medium">{item.year}</p>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="section-padding bg-muted">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-lg">
                  To be the foremost authority in Halal certification in Zambia,
                  fostering consumer confidence and enabling businesses to thrive in
                  global Halal markets.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 mb-4">
                  <Lightbulb className="h-7 w-7 text-secondary" />
                </div>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-lg">
                  To provide rigorous, transparent, and accessible Halal certification
                  services that uphold Shariah principles while supporting the growth
                  of Zambian businesses in the global economy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="What Drives Us"
            title="Our Core Values"
            description="The principles that guide every decision we make."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <value.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20 bg-secondary">
        <div className="container max-w-4xl text-center">
          <blockquote className="text-2xl md:text-3xl font-serif italic text-secondary-foreground mb-6">
            "Excellence in Halal certification is not just about compliance—it's about
            building trust, fostering integrity, and empowering African businesses to
            reach their full potential."
          </blockquote>
          <p className="text-secondary-foreground/80">
            — AHI Founding Principles
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Partner with Us?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join the growing network of businesses that trust AHI for their Halal certification needs.
          </p>
          <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
            <Link to="/contact">
              Get in Touch <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
