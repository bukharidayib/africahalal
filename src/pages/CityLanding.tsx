import { useParams, Link } from "react-router-dom";
import { ArrowRight, CheckCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData, createBreadcrumbSchema } from "@/components/seo/StructuredData";

const cityData: Record<string, { name: string; description: string }> = {
  ndola: { name: "Ndola", description: "Ndola, the third-largest city in Zambia and a major industrial hub on the Copperbelt, is home to food processors, manufacturers, and hospitality businesses seeking Halal certification." },
  kitwe: { name: "Kitwe", description: "Kitwe is a key commercial center on the Copperbelt with a growing food industry. AHI provides Halal certification for restaurants, hotels, and food manufacturers in Kitwe." },
  livingstone: { name: "Livingstone", description: "Livingstone, Zambia's tourism capital near Victoria Falls, has a thriving hospitality sector. Hotels, restaurants, and tour operators can benefit from AHI Halal certification." },
  chipata: { name: "Chipata", description: "Chipata, the gateway to Eastern Zambia and Malawi, serves as a cross-border trade hub. Halal certification helps businesses access regional export markets." },
  kabwe: { name: "Kabwe", description: "Kabwe, centrally located in Zambia, is a growing commercial center. AHI certifies food businesses, suppliers, and manufacturers in Kabwe." },
};

export default function CityLanding() {
  const { city } = useParams<{ city: string }>();
  const info = cityData[city?.toLowerCase() || ""] || { name: city || "City", description: `AHI provides Halal certification services in ${city}, Zambia.` };

  return (
    <Layout>
      <SEOHead
        title={`Halal Certification in ${info.name}, Zambia — African Halal Institute`}
        description={`Get Halal certification in ${info.name}, Zambia. AHI certifies restaurants, manufacturers, and hotels. Apply online today.`}
        canonical={`https://africanhalaal.com/halal-certification/${city}`}
        keywords={`halal certification ${info.name.toLowerCase()}, halal ${info.name.toLowerCase()} zambia, halal food ${info.name.toLowerCase()}`}
      />
      <StructuredData data={createBreadcrumbSchema([
        { name: "Home", url: "https://africanhalaal.com" },
        { name: "Halal Certification Zambia", url: "https://africanhalaal.com/halal-certification-zambia" },
        { name: info.name, url: `https://africanhalaal.com/halal-certification/${city}` },
      ])} />

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10">
            <MapPin className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium">{info.name}, Zambia</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Halal Certification in {info.name}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">{info.description}</p>
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

      {/* Services */}
      <section className="section-padding bg-background">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold mb-8 text-center">What We Certify in {info.name}</h2>
          <div className="space-y-3">
            {["Restaurants & cafes", "Hotels & lodges", "Food manufacturers", "Abattoirs & meat processors", "Catering services", "Suppliers & distributors"].map((item) => (
              <div key={item} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="font-medium">{item}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 space-y-4">
            <Button size="lg" asChild>
              <Link to="/halal-certification-zambia">Learn About the Full Process <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Also available in: <Link to="/halal-certification-lusaka" className="text-primary hover:underline">Lusaka</Link> •{" "}
              {Object.entries(cityData).filter(([k]) => k !== city?.toLowerCase()).map(([k, v], i, arr) => (
                <span key={k}>
                  <Link to={`/halal-certification/${k}`} className="text-primary hover:underline">{v.name}</Link>{i < arr.length - 1 ? " • " : ""}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Certified in {info.name}?</h2>
          <p className="text-primary-foreground/80 mb-8">Apply online from anywhere in Zambia. Our team will arrange inspections in {info.name}.</p>
          <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
            <Link to="/auth/signup">Start Application <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
