import { useState, useEffect } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface FAQItem {
    id: string;
    category: string;
    question: string;
    answer: string;
}

// Default FAQs in case database is empty
const defaultFAQs: FAQItem[] = [
    {
        id: "1",
        category: "Certification",
        question: "How long does the certification process take?",
        answer: "The certification process typically takes 4-6 weeks from application submission to certificate issuance, depending on the complexity of your operation and how quickly required documents are provided."
    },
    {
        id: "2",
        category: "Certification",
        question: "What documents are required for certification?",
        answer: "Required documents include: Business Registration Certificate (PACRA), TPIN/Tax Clearance, Ingredient Technical Specification Sheets, Halal Policy Statement, and Process Flow Diagrams. Additional documents may be required based on your sector."
    },
    {
        id: "3",
        category: "Inspection",
        question: "What happens during an inspection?",
        answer: "During an inspection, our certified inspector will visit your facility to verify compliance with Halal standards. They will review your processes, ingredients, storage, and documentation. You'll receive a detailed report after the inspection."
    },
    {
        id: "4",
        category: "Inspection",
        question: "Can I reschedule an inspection?",
        answer: "Yes, you can request to reschedule an inspection by contacting us at least 48 hours before the scheduled date. Please note that repeated rescheduling may delay your certification process."
    },
    {
        id: "5",
        category: "Certificates",
        question: "How long is my certificate valid?",
        answer: "Halal certificates are typically valid for 1 year from the date of issuance. You will receive renewal reminders 60 days before expiry."
    },
    {
        id: "6",
        category: "Certificates",
        question: "How can I verify a certificate?",
        answer: "You can verify any certificate using our online verification tool at /verify-certificate or by scanning the QR code on the certificate. This allows consumers and businesses to confirm authenticity."
    },
    {
        id: "7",
        category: "Account",
        question: "How do I update my organization details?",
        answer: "You can update most organization details from your client dashboard. For significant changes like registration number or legal name, please submit a support ticket with supporting documentation."
    },
    {
        id: "8",
        category: "Payment",
        question: "What payment methods do you accept?",
        answer: "We accept bank transfers, mobile money (Airtel/MTN), and major credit/debit cards. Payment details will be provided in your invoice after application approval."
    }
];

export default function SupportFAQ() {
    const [faqs, setFaqs] = useState<FAQItem[]>(defaultFAQs);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        try {
            const { data, error } = await supabase
                .from('faq_items')
                .select('id, category, question, answer')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            if (data && data.length > 0) {
                setFaqs(data);
            }
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            // Keep default FAQs on error
        } finally {
            setLoading(false);
        }
    };

    const filteredFAQs = faqs.filter(faq => 
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = [...new Set(filteredFAQs.map(f => f.category))];

    return (
        <ClientLayout>
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div>
                    <Link to="/client/support" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Support Center
                    </Link>
                    <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">Frequently Asked Questions</h1>
                    <p className="text-muted-foreground mt-1">Find quick answers to common questions</p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search FAQs..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* FAQs */}
                {loading ? (
                    <div className="space-y-4">
                        {Array(4).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : filteredFAQs.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="font-semibold text-lg mb-2">No Results Found</h3>
                            <p className="text-muted-foreground">
                                No FAQs match your search. Try different keywords or{" "}
                                <Link to="/client/support/tickets/new" className="text-primary hover:underline">
                                    create a support ticket
                                </Link>.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    categories.map((category) => (
                        <Card key={category}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Badge variant="outline">{category}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <Accordion type="single" collapsible className="w-full">
                                    {filteredFAQs
                                        .filter(f => f.category === category)
                                        .map((faq) => (
                                            <AccordionItem key={faq.id} value={faq.id}>
                                                <AccordionTrigger className="text-left">
                                                    {faq.question}
                                                </AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground">
                                                    {faq.answer}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))
                                    }
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))
                )}

                {/* Still need help */}
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6 text-center">
                        <h3 className="font-semibold text-lg mb-2">Still need help?</h3>
                        <p className="text-muted-foreground mb-4">
                            Can't find what you're looking for? Our support team is here to help.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link to="/client/support/tickets/new">
                                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                                    Create Support Ticket
                                </button>
                            </Link>
                            <Link to="/client/support/chat">
                                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                    Start Live Chat
                                </button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ClientLayout>
    );
}
