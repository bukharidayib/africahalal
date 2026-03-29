import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, MapPin, Building2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Layout } from "@/components/layout/Layout";

const lusakaFaqs = [
  { question: "Where is the AHI office in Lusaka?", answer: "The African Halal Institute is headquartered in Matero, Lusaka, Zambia. Visit us during business hours or contact us at info@africanhalaal.com." },
  { question: "How much does Halal certification cost in Lusaka?", answer: "Certification fees vary by business size and type. Restaurants and small businesses have affordable packages starting from ZMW 2,500. Contact us for a customized quote." },
  { question: "Which restaurants in Lusaka are Halal certified?", answer: "You can browse all Halal-certified restaurants and businesses in Lusaka through our online directory at africanhalaal.com/directory." },
  { question: "Can I get my restaurant Halal certified in Lusaka?", answer: "Yes! AHI certifies restaurants, cafes, and food establishments in Lusaka. The process includes application, inspection, and Shariah board review." },
];

export default function HalalCertificationLusaka() {
  return (
    <Layout>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10">
            <MapPin className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium">Lusaka, Zambia</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Halal Certification in Lusaka
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            AHI is headquartered in Lusaka and serves businesses across the capital city. Get your restaurant, factory, or hotel Halal certified with our local team.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
              <Link to="/auth/signup">Apply Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/directory">Browse Lusaka Directory</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Lusaka Services */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Halal Certification Services in Lusaka</h2>
              <p className="text-muted-foreground mb-6">
                As Zambia's capital and largest city, Lusaka is home to a vibrant food industry. The African Halal Institute provides comprehensive Halal certification for Lusaka businesses including:
              </p>
              <div className="space-y-3">
                {["Restaurants, cafes & coffee shops in Lusaka", "Hotels and hospitality venues", "Meat processing plants and abattoirs", "Food manufacturers and packagers", "Catering companies and suppliers", "Import/export food businesses"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <p className="font-medium">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button asChild>
                  <Link to="/halal-certification-zambia">View Full Certification Process <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Visit Our Lusaka Office</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">African Halal Institute</p>
                    <p className="text-sm text-muted-foreground">Matero, Lusaka, Zambia</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <p className="text-sm">+260972044414</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <p className="text-sm">info@africanhalaal.com</p>
                </div>
                <Button className="w-full mt-4" asChild>
                  <Link to="/contact">Contact Us <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-muted">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Halal Certification FAQs — Lusaka</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {lusakaFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-lg border px-6">
                <AccordionTrigger className="text-left font-semibold">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Get Halal Certified in Lusaka Today</h2>
          <p className="text-primary-foreground/80 mb-8">Join Lusaka's growing network of Halal-certified businesses. Apply online or visit our Matero office.</p>
          <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
            <Link to="/auth/signup">Start Your Application <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
