import { useState } from "react";
import { SEO } from "@/components/SEO";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const contactInfo = [
  { icon: Mail, label: "Email", value: "info@africanhalaal.com", link: "mailto:info@africanhalaal.com" },
  { icon: Phone, label: "Phone", value: "+260 972 044 414", link: "tel:+260972044414" },
  { icon: MapPin, label: "Address", value: "Lusaka, Zambia (Main Headquarters)" },
  { icon: Clock, label: "Hours", value: "Mon-Fri: 8:00 AM - 5:00 PM (CAT)" },
];



export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submissionId = crypto.randomUUID();
      const { error } = await supabase.from("contact_submissions").insert({
        id: submissionId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        subject: formData.subject,
        message: formData.message,
      });

      if (error) throw error;

      // Send email notifications to both recipients
      const recipients = ["info@africanhalaal.com", "support@africanhalaal.com"];
      await Promise.all(
        recipients.map((to) =>
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "contact-form-notification",
              recipientEmail: to,
              idempotencyKey: `contact-${submissionId}-${to}`,
              templateData: {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                company: formData.company,
                subject: formData.subject,
                message: formData.message,
              },
            },
          }).catch((err) => console.error(`Email to ${to} failed:`, err))
        )
      );

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", phone: "", company: "", subject: "", message: "" });
    } catch (err) {
      console.error("Contact submission failed:", err);
      toast.error("Could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Contact African Halal Institute — Halal Certification Enquiries Zambia"
        description="Contact AHI in Lusaka, Zambia for Halal certification enquiries, applications, and support. Phone: +260 972 044 414. Email: info@africanhalaal.com."
        keywords="contact AHI, halal certification contact zambia, african halal institute phone"
        canonicalPath="/contact"
      />
      {/* Hero */}
      <HeroSection
        subtitle="Get in Touch"
        title="Let's Connect"
        description="Have questions about Halal certification? Ready to apply? Our team is here to help you every step of the way."
        size="md"
        variant="centered"
      />

      {/* Contact Form & Info */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        {item.link ? (
                          <a href={item.link} className="font-medium hover:text-primary transition-colors">
                            {item.value}
                          </a>
                        ) : (
                          <p className="font-medium">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-primary-foreground/80">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span>Response within 24 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span>Dedicated certification support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span>Multilingual team available</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Full Name *</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email Address *</label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Phone Number</label>
                        <Input
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Company/Organization</label>
                        <Input
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="Your company name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Subject *</label>
                      <Input
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What is your message about?"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Message *</label>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your inquiry..."
                        rows={5}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          Send Message <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>


      {/* Google Map */}
      <section className="h-96 bg-muted border-t">
        <iframe
          title="African Halal Institute — Lusaka, Zambia"
          src="https://www.google.com/maps?q=Lusaka,Zambia&output=embed"
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </section>
    </Layout>
  );
}
