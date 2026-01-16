import { useState } from "react";
import { Link } from "react-router-dom";
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
    id: "food",
    name: "Food & Beverage",
    icon: Utensils,
    description: "Comprehensive certification for food manufacturers, processors, and beverage producers.",
    subcategories: [
      {
        icon: Croissant,
        name: "Bakery & Confectionery",
        items: ["Breads and pastries", "Chocolates and sweets", "Biscuits and cookies", "Cakes and desserts"]
      },
      {
        icon: Coffee,
        name: "Beverages",
        items: ["Soft drinks", "Fruit juices", "Energy drinks", "Flavored waters"]
      },
      {
        icon: IceCream,
        name: "Dairy Products",
        items: ["Milk and cream", "Cheese and butter", "Yogurt and ice cream", "Dairy alternatives"]
      },
      {
        icon: Soup,
        name: "Processed Foods",
        items: ["Canned goods", "Frozen foods", "Ready meals", "Sauces and condiments"]
      },
    ]
  },
  {
    id: "meat",
    name: "Abattoirs & Meat",
    icon: Factory,
    description: "Specialized certification for slaughterhouses and meat processing facilities.",
    subcategories: [
      {
        icon: Beef,
        name: "Slaughter Facilities",
        items: ["Cattle abattoirs", "Poultry processing", "Sheep and goat facilities", "Mobile slaughter units"]
      },
      {
        icon: Factory,
        name: "Meat Processing",
        items: ["Deboning and portioning", "Sausage manufacturing", "Cured meats", "Meat packaging"]
      },
      {
        icon: Fish,
        name: "Seafood Processing",
        items: ["Fish processing plants", "Shellfish facilities", "Seafood packaging", "Cold storage"]
      },
      {
        icon: Warehouse,
        name: "Cold Chain",
        items: ["Refrigerated storage", "Frozen goods handling", "Transport verification", "Temperature monitoring"]
      },
    ]
  },
  {
    id: "hospitality",
    name: "Hospitality",
    icon: Hotel,
    description: "Certification for hotels, restaurants, and catering services serving Halal cuisine.",
    subcategories: [
      {
        icon: Hotel,
        name: "Hotels & Resorts",
        items: ["Full-service hotels", "Resort properties", "Guest houses", "Serviced apartments"]
      },
      {
        icon: ChefHat,
        name: "Restaurants",
        items: ["Fine dining", "Casual dining", "Fast food outlets", "Cafés and bistros"]
      },
      {
        icon: Soup,
        name: "Catering Services",
        items: ["Event catering", "Corporate catering", "Airline catering", "Hospital food services"]
      },
      {
        icon: Building2,
        name: "Institutional",
        items: ["School cafeterias", "University dining", "Hospital kitchens", "Prison food services"]
      },
    ]
  },
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
  const [activeTab, setActiveTab] = useState("food");

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
                title="Benefits of AHIS Certification"
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
