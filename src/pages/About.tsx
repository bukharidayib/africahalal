import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Award,
  Eye,
  Globe,
  Target,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Heart,
  Handshake
} from "lucide-react";
import aboutHeroImg from "@/assets/about-hero.jpg";
  Shield,
  Award,
  Eye,
  Globe,
  Target,
  Lightbulb,
  Users,
  Utensils,
  Factory,
  Hotel,
  ArrowRight,
  CheckCircle,
  Heart,
  Handshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const stats = [
  { value: "Zambia", label: "Headquarters" },
  { value: "Africa", label: "Continental Vision" },
  { value: "10+", label: "Years of Excellence" },
  { value: "50+", label: "Expert Auditors" },
];

const sectors = [
  { icon: Utensils, title: "Restaurants & Coffee", description: "Dining establishments and cafes" },
  { icon: Factory, title: "Abattoirs", description: "Meat slaughter facilities" },
  { icon: Factory, title: "Meat Processing", description: "Meat processing and packaging" },
  { icon: Hotel, title: "Hospitality", description: "Hotels and accommodation services" },
  { icon: Factory, title: "Manufacturing", description: "Manufacturing plants and factories" },
];

const coreValues = [
  { icon: Shield, title: "Integrity", description: "Upholding the highest ethical standards in every certification decision" },
  { icon: Award, title: "Excellence", description: "Striving for perfection in our processes and service delivery" },
  { icon: Eye, title: "Transparency", description: "Open and honest communication with all stakeholders" },
  { icon: Heart, title: "Faith-Based Integrity", description: "Combining technical expertise with authentic Shariah compliance" },
  { icon: Handshake, title: "Trust", description: "Building a standard of trust between businesses and consumers" },
  { icon: Globe, title: "Pan-African Vision", description: "Creating a unified, trusted Halal certification system across Africa" },
];

export default function About() {
  return (
    <Layout>
      <HeroSection
        subtitle="About AHI"
        title="Building a Standard of Trust"
        description="The African Halal Institute (AHI) is a Zambia-based Halal certification and advisory body committed to building trust, transparency, and excellence within the Halal ecosystem."
        size="lg"
      />

      {/* About AHI */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-secondary font-medium mb-2 tracking-wide uppercase text-sm">
                Who We Are
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
                Pioneering Halal Excellence in Africa
              </h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Founded with a clear vision to serve both businesses and consumers, AHI is focused on 
                establishing reliable, Shariah-compliant certification standards that meet global 
                expectations while remaining practical for local markets.
              </p>
              <p className="text-muted-foreground mb-6">
                We work closely with businesses to ensure their products, processes, and operations 
                align with authentic Halal requirements. Our approach combines technical expertise, 
                regulatory understanding, and faith-based integrity to help businesses access new 
                markets and build consumer confidence.
              </p>
              <p className="text-muted-foreground mb-8">
                Starting in Zambia, AHI is dedicated to supporting the growth of Halal-compliant 
                industries across food, hospitality, manufacturing, and beyond. As we grow, our 
                ambition is to expand across Africa—creating a unified, trusted Halal certification 
                system that empowers businesses, protects consumers, and strengthens the Muslim 
                community's economic footprint.
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
                <p className="text-2xl font-bold text-secondary-foreground">Africa</p>
                <p className="text-sm text-secondary-foreground/80">Our Vision</p>
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
                  To be the foremost authority in Halal certification across Africa,
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
                  of businesses across Africa and the global economy.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
            "At AHI, we are not just certifying products—we are building a standard of trust."
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
