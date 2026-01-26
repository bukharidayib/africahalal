import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import {
    Files,
    Upload,
    Search,
    Filter,
    MoreVertical,
    Download,
    Eye,
    Clock,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const categories = [
    "All Documents",
    "Ingredient Lists",
    "Supplier Declarations",
    "SOPs & Protocols",
    "Sanitation Logs",
    "Legal & Admin"
];

const documents = [
    {
        id: "DOC-001",
        name: "Standard Operating Procedure - Slaughter.pdf",
        category: "SOPs & Protocols",
        status: "Verified",
        date: "20 Jan 2026",
        expiry: "20 Jan 2027",
        size: "2.4 MB"
    },
    {
        id: "DOC-002",
        name: "Supplier Declaration - Zenith Meats.jpg",
        category: "Supplier Declarations",
        status: "Under Review",
        date: "22 Jan 2026",
        expiry: "N/A",
        size: "1.1 MB"
    },
    {
        id: "DOC-003",
        name: "Halal Policy Statement 2026.pdf",
        category: "Legal & Admin",
        status: "Verified",
        date: "15 Jan 2026",
        expiry: "15 Jan 2030",
        size: "0.8 MB"
    },
    {
        id: "DOC-004",
        name: "Cleaning & Sanitation Schedule Q1.pdf",
        category: "Sanitation Logs",
        status: "Expired",
        date: "01 Nov 2025",
        expiry: "01 Jan 2026",
        size: "1.5 MB"
    },
];

export default function DocumentVault() {
    const [activeTab, setActiveTab] = useState("All Documents");

    return (
        <ClientLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-serif tracking-tight">Document vault</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Review, track, and upload your compliance evidence.</p>
                    </div>
                    <Button className="bg-primary text-white hover:bg-primary/90 shadow-md">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Evidence
                    </Button>
                </div>

                {/* Info Box */}
                <div className="bg-muted/30 border-l-4 border-secondary p-4 rounded-r-lg flex gap-4 items-start">
                    <ShieldCheck className="h-6 w-6 text-secondary mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-foreground">Governance Rule: No Deletion</p>
                        <p className="text-muted-foreground mt-0.5">
                            To maintain certification integrity, documents cannot be deleted once uploaded. You can upload new versions if corrections are required.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search document by name..." className="pl-10 h-11 border-border" />
                    </div>
                    <Button variant="outline" className="h-11">
                        <Filter className="mr-2 h-4 w-4" />
                        Advanced Filter
                    </Button>
                </div>

                {/* Categories Tabs */}
                <Tabs defaultValue="All Documents" className="w-full" onValueChange={setActiveTab}>
                    <div className="overflow-x-auto pb-2 scrollbar-hide">
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 w-max">
                            {categories.map((cat) => (
                                <TabsTrigger
                                    key={cat}
                                    value={cat}
                                    className="px-4 py-2 rounded-full border-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary transition-all font-bold text-xs uppercase"
                                >
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>

                {/* Document List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="group hover:shadow-xl transition-all duration-300 border-none bg-card shadow-md relative overflow-hidden">
                            {/* Status Ribbon */}
                            <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-bl-lg ${doc.status === 'Verified' ? 'bg-green-500/10 text-green-600' :
                                    doc.status === 'Under Review' ? 'bg-amber-500/10 text-amber-600' :
                                        'bg-destructive/10 text-destructive'
                                }`}>
                                {doc.status}
                            </div>

                            <CardHeader className="pt-8 pb-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-base font-bold leading-tight line-clamp-2">
                                    {doc.name}
                                </CardTitle>
                                <CardDescription className="text-xs uppercase font-mono tracking-tighter mt-1">
                                    {doc.category}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block">Uploaded:</span>
                                        <span className="font-semibold">{doc.date}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Expiry:</span>
                                        <span className={`font-semibold ${doc.status === 'Expired' ? 'text-destructive' : 'text-foreground'}`}>
                                            {doc.expiry}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-between border-t border-border/50">
                                    <span className="text-[10px] font-mono text-muted-foreground">{doc.size} | {doc.id}</span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>New Version</DropdownMenuItem>
                                                <DropdownMenuItem>Share with AHI</DropdownMenuItem>
                                                <DropdownMenuItem className="text-muted-foreground opacity-50 cursor-not-allowed">Delete (Disabled)</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </ClientLayout>
    );
}
