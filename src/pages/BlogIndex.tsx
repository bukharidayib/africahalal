import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Info, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  image_url: string;
  published_at: string;
}

export default function BlogIndex() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from('blogs' as any)
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false }) as any);
      if (data) setBlogs(data as BlogPost[]);
      setIsLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <section className="bg-primary text-primary-foreground py-16 md:py-20">
        <div className="container max-w-4xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">AHI Blog</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Halal certification guides, industry news, and insights from the African Halal Institute.
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              <p className="mt-4 text-muted-foreground">Loading articles...</p>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20">
              <Info className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're preparing articles on Halal certification, compliance, and industry insights. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Card key={blog.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all h-full flex flex-col">
                  {blog.image_url ? (
                    <div className="h-52 overflow-hidden">
                      <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                  ) : (
                    <div className="h-52 bg-secondary/10 flex items-center justify-center">
                      <Info className="h-12 w-12 text-secondary/40" />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <p className="text-xs font-medium text-primary mb-2">
                      {new Date(blog.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors line-clamp-2">{blog.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow pb-4">
                    <p className="text-muted-foreground line-clamp-3 text-sm">{blog.excerpt}</p>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Button variant="ghost" className="p-0 h-auto text-primary" asChild>
                      <Link to={`/blog/${blog.slug}`}>Read More <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
