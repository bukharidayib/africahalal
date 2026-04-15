import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import {
  Utensils,
  Factory,
  Hotel,
  Beef,
  Coffee,
  Croissant,
  Fish,
  IceCream,
  Soup,
  ChefHat,
  Building2,
  Warehouse,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const sectors = [
  {
    id: "restaurants_coffee",
    name: "Restuarents & Coffee",
    icon: Coffee,
    description: "Certification for dining establishments and coffee shops ensuring Halal compliance.",
    subcategories: [
      {
        icon: ChefHat,
        name: "Fine & Casual Dining",
        items: ["Full-service restaurants", "Bistros and cafes", "Fast food outlets", "Coffee shops"]
      },
      {
        icon: Coffee,
        name: "Specialty Coffee",
        items: ["Roasteries", "Cafes", "Bean sourcing", "Beverage preparation"]
      }
    ]
  },
  {
    id: "abattoirs",
    name: "Abbatoirs",
    icon: Beef,
    description: "Specialized certification for slaughterhouses and primary meat processing.",
    subcategories: [
      {
        icon: Beef,
        name: "Slaughter Facilities",
        items: ["Cattle abattoirs", "Poultry processing", "Sheep and goat facilities", "Mobile slaughter units"]
      }
    ]
  },
  {
    id: "meat_processing",
    name: "Meat Processing",
    icon: Factory,
    description: "Value-added meat products and processing facilities.",
    subcategories: [
      {
        icon: Factory,
        name: "Processing",
        items: ["Deboning and portioning", "Sausage manufacturing", "Cured meats", "Meat packaging"]
      }
    ]
  },
  {
    id: "hospitality",
    name: "Hospitality",
    icon: Hotel,
    description: "Certification for hotels, resorts, and tourism services.",
    subcategories: [
      {
        icon: Hotel,
        name: "Hotels & Resorts",
        items: ["Full-service hotels", "Resort properties", "Guest houses", "Serviced apartments"]
      },
      {
        icon: Soup,
        name: "Catering",
        items: ["Event catering", "Corporate catering", "Airline catering"]
      }
    ]
  },
  {
    id: "manufacturies",
    name: "Manufacturies",
    icon: Building2,
    description: "Industrial manufacturing of food and consumer goods.",
    subcategories: [
      {
        icon: CheckCircle2,
        name: "General Manufacturing",
        items: ["Processed foods", "Beverages", "Pharmaceuticals", "Cosmetics"]
      }
    ]
  }
];

const certificationBenefits = [
  "Access to growing Halal consumer market",
  "Enhanced brand trust and credibility",
  "Compliance with export requirements",
  "Competitive advantage in marketplace",
  "Support for Muslim tourism sector",
  "International market access",
];

export default function Industries() {
  const [activeTab, setActiveTab] = useState("restaurants_coffee");

  return (
    <Layout>
      {/* Hero */}
      <HeroSection
        subtitle="Industries We Certify"
        title="Specialized Halal Certification Across Sectors"
        description="Tailored certification services for diverse industries, each with unique requirements and compliance standards."
        size="lg"
      />

      {/* Industry Tabs */}
      <section className="section-padding bg-background">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-12">
              {sectors.map((sector) => (
                <TabsTrigger key={sector.id} value={sector.id} className="gap-2">
                  <sector.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{sector.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {sectors.map((sector) => (
              <TabsContent key={sector.id} value={sector.id}>
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                    <sector.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{sector.name}</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">{sector.description}</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {sector.subcategories.map((sub) => (
                    <Card key={sub.name} className="group hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors mb-2">
                          <sub.icon className="h-6 w-6 text-secondary" />
                        </div>
                        <CardTitle className="text-lg">{sub.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {sub.items.map((item) => (
                            <li key={item} className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding bg-muted">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeader
                subtitle="Why Get Certified"
                title="Benefits of AHI Certification"
                align="left"
              />
              <ul className="space-y-4">
                {certificationBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-secondary flex-shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="border-none shadow-xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-2xl">Industry-Specific Standards</CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Tailored for your sector
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-primary-foreground/90">
                  Each industry has unique Halal compliance requirements. Our certification
                  programs are specifically designed to address the particular challenges and
                  standards relevant to your sector.
                </p>
                <p className="text-primary-foreground/90">
                  From slaughter procedures in abattoirs to kitchen protocols in restaurants,
                  we provide comprehensive guidance and verification tailored to your operations.
                </p>
                <Button className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                  <Link to="/contact">
                    Discuss Your Industry <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Not Listed */}
      <section className="py-16 bg-secondary">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-secondary-foreground mb-4">
            Sector Not Listed?
          </h2>
          <p className="text-secondary-foreground/80 mb-8 max-w-xl mx-auto">
            We're continuously expanding our certification scope. Contact us to discuss
            your specific industry requirements.
          </p>
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link to="/contact">
              Contact Our Team <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
