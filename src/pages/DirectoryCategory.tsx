import { useParams, Link } from "react-router-dom";
import { ArrowRight, Building2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";

const categoryData: Record<string, { title: string; description: string; h1: string }> = {
  "halal-restaurants-lusaka": {
    title: "Halal Restaurants in Lusaka — Certified Directory",
    description: "Browse AHI-certified Halal restaurants in Lusaka, Zambia. Verified Halal-compliant dining options in the capital city.",
    h1: "Halal Restaurants in Lusaka",
  },
  "halal-suppliers-zambia": {
    title: "Halal Suppliers in Zambia — Certified Directory",
    description: "Find verified Halal suppliers in Zambia. Browse AHI-certified food suppliers, distributors, and wholesalers.",
    h1: "Halal Suppliers in Zambia",
  },
  "halal-hotels-zambia": {
    title: "Halal Hotels in Zambia — Certified Hospitality Directory",
    description: "Discover Halal-certified hotels and hospitality venues in Zambia. Browse AHI-verified accommodations.",
    h1: "Halal-Certified Hotels in Zambia",
  },
  "halal-manufacturers-zambia": {
    title: "Halal Manufacturers in Zambia — Certified Directory",
    description: "Browse Halal-certified food manufacturers and processors in Zambia. Verified by the African Halal Institute.",
    h1: "Halal Manufacturers in Zambia",
  },
};

export default function DirectoryCategory() {
  const { category } = useParams<{ category: string }>();
  const info = categoryData[category || ""] || {
    title: `Halal ${(category || "").replace(/-/g, " ")} — Certified Directory`,
    description: `Browse AHI-certified Halal businesses in Zambia.`,
    h1: `Halal ${(category || "").replace(/-/g, " ")}`,
  };

  return (
    <Layout>
      <SEO
        title={info.title}
        description={info.description}
        canonicalPath={`/directory/${category}`}
      />
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-20">
        <div className="container max-w-4xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{info.h1}</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">{info.description}</p>
          <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 mt-4" asChild>
            <Link to="/directory">Browse Full Directory <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="container max-w-3xl text-center space-y-8">
          <div className="p-12 rounded-2xl border-2 border-dashed border-muted bg-muted/30">
            <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Directory Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              We're building out category-specific directory pages. In the meantime, browse our full directory to find certified businesses.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/directory">View Full Directory <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Browse by Category</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(categoryData).map(([slug, data]) => (
                <Button key={slug} variant="outline" size="sm" asChild>
                  <Link to={`/directory/${slug}`}>{data.h1}</Link>
                </Button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Want to be listed? <Link to="/halal-certification-zambia" className="text-primary hover:underline">Get Halal certified</Link> by the African Halal Institute.
          </p>
        </div>
      </section>
    </Layout>
  );
}
