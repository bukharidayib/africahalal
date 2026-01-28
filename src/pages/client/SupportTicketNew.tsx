import { useState } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const categories = [
    "Application Issue",
    "Document Upload",
    "Payment Query",
    "Technical Problem",
    "Inspection Related",
    "Certificate Query",
    "Account Issue",
    "General Inquiry"
];

const priorities = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" }
];

export default function SupportTicketNew() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        subject: "",
        category: "",
        priority: "normal",
        message: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.subject || !formData.category || !formData.message) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all required fields."
            });
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Generate ticket number
            const { data: ticketNumber } = await supabase.rpc('generate_ticket_number');

            // Create ticket
            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    ticket_number: ticketNumber || `TKT-${Date.now()}`,
                    user_id: user.id,
                    subject: formData.subject,
                    category: formData.category,
                    priority: formData.priority,
                    status: 'open'
                })
                .select('id')
                .single();

            if (ticketError) throw ticketError;

            // Add initial message
            const { error: messageError } = await supabase
                .from('ticket_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    sender_type: 'client',
                    message: formData.message
                });

            if (messageError) throw messageError;

            toast({
                title: "Ticket Created",
                description: `Your support ticket ${ticketNumber} has been submitted.`
            });

            navigate(`/client/support/tickets/${ticket.id}`);
        } catch (error: any) {
            console.error('Error creating ticket:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to create ticket."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ClientLayout>
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div>
                    <Link to="/client/support/tickets" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Tickets
                    </Link>
                    <h1 className="text-3xl font-bold font-serif tracking-tight text-foreground">Create Support Ticket</h1>
                    <p className="text-muted-foreground mt-1">Describe your issue and we'll get back to you as soon as possible</p>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    placeholder="Brief description of your issue"
                                    value={formData.subject}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                                        disabled={loading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                                        disabled={loading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorities.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message *</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Describe your issue in detail..."
                                    className="min-h-[150px]"
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => navigate('/client/support/tickets')}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Submit Ticket
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </ClientLayout>
    );
}
