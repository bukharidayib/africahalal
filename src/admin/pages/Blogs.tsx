import React, { useState, useEffect } from "react";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Blog {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    image_url?: string;
    published: boolean;
    created_at: string;
}

export default function Blogs() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        excerpt: "",
        image_url: "",
        content: "",
        published: false
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase
                .from('blogs' as any)
                .select('*')
                .order('created_at', { ascending: false }) as any);

            if (error) throw error;
            setBlogs((data || []) as Blog[]);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error fetching blogs",
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        if (!formData.title || !formData.slug) {
            toast({ variant: "destructive", title: "Title and slug are required" });
            return;
        }

        try {
            if (editingId) {
                const { error } = await (supabase
                    .from('blogs' as any)
                    .update(formData as any)
                    .eq('id', editingId) as any);
                if (error) throw error;
                toast({ title: "Blog updated" });
            } else {
                const { error } = await (supabase
                    .from('blogs' as any)
                    .insert(formData as any) as any);
                if (error) throw error;
                toast({ title: "Blog created" });
            }

            setIsCreateOpen(false);
            setEditingId(null);
            setFormData({ title: "", slug: "", excerpt: "", image_url: "", content: "", published: false });
            fetchBlogs();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error saving blog",
                description: error.message
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            const { error } = await (supabase.from('blogs' as any).delete().eq('id', id) as any);
            if (error) throw error;
            fetchBlogs();
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message });
        }
    };

    const openEdit = (blog: Blog) => {
        setFormData({
            title: blog.title,
            slug: blog.slug,
            excerpt: blog.excerpt || "",
            image_url: blog.image_url || "",
            content: blog.content,
            published: blog.published
        });
        setEditingId(blog.id);
        setIsCreateOpen(true);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Blog CMS</h2>
                        <p className="text-muted-foreground">Manage articles and content for the landing page.</p>
                    </div>
                    <Button onClick={() => { setEditingId(null); setFormData({ title: "", slug: "", excerpt: "", image_url: "", content: "", published: false }); setIsCreateOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Post
                    </Button>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : blogs.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">No blogs found.</TableCell></TableRow>
                            ) : (
                                blogs.map(blog => (
                                    <TableRow key={blog.id}>
                                        <TableCell className="font-medium">{blog.title}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{blog.slug}</TableCell>
                                        <TableCell>
                                            <Badge variant={blog.published ? "default" : "secondary"}>
                                                {blog.published ? "Published" : "Draft"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right gap-2 flex justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(blog)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(blog.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title *</Label>
                                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slug *</Label>
                                    <Input value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Excerpt (Short description)</Label>
                                <Textarea value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Image</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            try {
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${Math.random()}.${fileExt}`;
                                                const filePath = `${fileName}`;

                                                const { error: uploadError } = await supabase.storage
                                                    .from('blog-images')
                                                    .upload(filePath, file);

                                                if (uploadError) throw uploadError;

                                                const { data } = supabase.storage
                                                    .from('blog-images')
                                                    .getPublicUrl(filePath);

                                                setFormData({ ...formData, image_url: data.publicUrl });
                                                toast({ title: "Image uploaded successfully" });
                                            } catch (error: any) {
                                                toast({
                                                    variant: "destructive",
                                                    title: "Upload failed",
                                                    description: error.message
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-px bg-border text-center relative">
                                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">OR</span>
                                    </div>
                                </div>
                                <Input
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="Enter Image URL manually..."
                                />
                                {formData.image_url && (
                                    <div className="relative aspect-video w-full overflow-hidden rounded-md border mt-2">
                                        <img src={formData.image_url} alt="Preview" className="object-cover w-full h-full" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Content (Markdown supported) *</Label>
                                <Textarea className="min-h-[200px] font-mono" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="published" checked={formData.published} onCheckedChange={checked => setFormData({ ...formData, published: checked })} />
                                <Label htmlFor="published">Publish immediately</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateOrUpdate}>{editingId ? "Update" : "Create"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
