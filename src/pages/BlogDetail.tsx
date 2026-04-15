import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";

interface BlogPost {
    id: string;
    title: string;
    content: string;
    image_url: string;
    published_at: string;
    author_id: string;
}

export default function BlogDetail() {
    const { slug } = useParams();
    const [blog, setBlog] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) fetchBlog();
    }, [slug]);

    const fetchBlog = async () => {
        try {
            const { data, error } = await (supabase
                .from('blogs' as any)
                .select('*')
                .eq('slug', slug)
                .eq('published', true)
                .single() as any);

            if (error) throw error;
            setBlog(data as BlogPost);
        } catch (error) {
            console.error("Error fetching blog", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Layout>
            <div className="container py-20 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        </Layout>
    );

    if (!blog) return (
        <Layout>
            <div className="container py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
                <Button asChild><Link to="/">Return Home</Link></Button>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <SEO
              title={`${blog.title} | African Halal Institute`}
              description={blog.title}
              canonicalPath={`/blog/${slug}`}
              ogType="article"
              ogImage={blog.image_url}
              structuredData={{
                "@context": "https://schema.org",
                "@type": "Article",
                headline: blog.title,
                datePublished: blog.published_at,
                publisher: { "@type": "Organization", name: "African Halal Institute" },
              }}
            />
            <article className="min-h-screen pb-20">
                {blog.image_url ? (
                    <div className="w-full h-[400px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/40 z-10" />
                        <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 z-20 container flex flex-col justify-end pb-12">
                            <Button variant="outline" size="sm" className="w-fit mb-6 text-white border-white hover:bg-white/20" asChild>
                                <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                            </Button>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{blog.title}</h1>
                            <div className="flex items-center text-white/80 gap-4 text-sm">
                                <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" /> {new Date(blog.published_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="container pt-20 pb-10">
                        <Button variant="ghost" size="sm" className="mb-6" asChild>
                            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                        </Button>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{blog.title}</h1>
                        <div className="flex items-center text-muted-foreground gap-4 text-sm">
                            <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" /> {new Date(blog.published_at).toLocaleDateString()}</span>
                        </div>
                        <hr className="mt-8" />
                    </div>
                )}

                <div className="container max-w-3xl py-10">
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap">{blog.content}</div>
                    </div>
                </div>
            </article>
        </Layout>
    );
}
