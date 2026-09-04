import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import {
  Search,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Building2,
  BadgeCheck,
  Loader2,
  Shield,
  Phone,
  Mail,
  Globe
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const sectors = ["All Sectors", "Restaurants & Coffee", "Abattoirs", "Meat Processing", "Hospitality", "Manufacturing"];
const statuses = ["All Status", "Active", "Expired", "Suspended"];

interface CertifiedCompany {
  id: string;
  certificate_number: string;
  status: string;
  scope: string;
  issue_date: string;
  expiry_date: string;
  organizations: {
    name: string;
    registration_number: string;
    sector: string;
    address: string | null;
    city: string | null;
    country: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  } | null;
}

export default function Directory() {
  const [searchParams] = useSearchParams();
  const certificateParam = searchParams.get("certificate") || searchParams.get("cert");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedInstitution, setSelectedInstitution] = useState<CertifiedCompany | null>(null);
  const [institutions, setInstitutions] = useState<CertifiedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (!certificateParam || institutions.length === 0) return;
    const match = institutions.find((inst) =>
      inst.certificate_number.toLowerCase() === certificateParam.toLowerCase() ||
      inst.id === certificateParam,
    );
    if (match) {
      setSelectedInstitution(match);
      setSearchQuery(match.certificate_number);
    }
  }, [certificateParam, institutions]);

  async function fetchInstitutions() {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('certificates')
        .select(`
          id,
          certificate_number,
          status,
          directory_visible,
          scope,
          issue_date,
          expiry_date,
          organizations (
            name,
            registration_number,
            sector,
            address,
            city,
            country,
            contact_email,
            contact_phone
          )
        `)
        .eq('status', 'active')
        .eq('directory_visible', true)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Auto-expire any active certificates whose expiry has passed (best-effort, ignore errors)
      try { await supabase.rpc('expire_lapsed_applications' as any); } catch {}

      const rows = (data as any[]) || [];
      setInstitutions(rows);
    } catch (error) {
      console.error('Error fetching directory:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredInstitutions = institutions.filter((inst) => {
    const orgName = inst.organizations?.name || "";
    const orgAddress = inst.organizations?.address || "";
    const orgCity = inst.organizations?.city || "";
    const regNumber = inst.organizations?.registration_number || "";

    const matchesSearch =
      orgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orgAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orgCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.certificate_number.toLowerCase().includes(searchQuery.toLowerCase());

    const orgSector = inst.organizations?.sector || "";
    const matchesSector =
      selectedSector === "All Sectors" ||
      orgSector.toLowerCase().includes(selectedSector.toLowerCase()) ||
      inst.scope.toLowerCase().includes(selectedSector.toLowerCase());

    const matchesStatus =
      selectedStatus === "All Status" ||
      inst.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesSector && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-500 hover:bg-green-600";
      case "expired": return "bg-red-500 hover:bg-red-600";
      case "suspended": return "bg-amber-500 hover:bg-amber-600";
      default: return "bg-muted";
    }
  };

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  return (
    <Layout>
      <SEO
        title="Halal Certified Businesses Zambia — Official AHI Directory"
        description="Browse AHI's official directory of Halal-certified businesses in Zambia. Find verified restaurants, manufacturers, hotels and service providers."
        keywords="halal certified businesses zambia, halal directory, halal restaurants zambia"
        canonicalPath="/directory"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Halal Certified Businesses in Zambia",
          description: "Directory of AHI-certified Halal businesses in Zambia",
        }}
      />
      <HeroSection
        subtitle="Certified Directory"
        title="Halal Certified Business Registry"
        description="Explore our network of approved and certified businesses. Verify their Halal certification status, scope, and validity."
        size="md"
      />

      {/* Search & Filters */}
      <section className="py-8 bg-muted border-b">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, registration number, location, or certificate ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Showing {filteredInstitutions.length} of {institutions.length} certified businesses
          </p>
        </div>
      </section>

      {/* Directory Grid */}
      <section className="section-padding bg-background">
        <div className="container">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              <p className="mt-4 text-muted-foreground animate-pulse">Loading directory data...</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInstitutions.map((inst) => (
                  <Card key={inst.id} className="hover:shadow-lg transition-all hover:-translate-y-1 border-primary/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg leading-tight">
                              {inst.organizations?.name || "Private Entity"}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground font-mono">{inst.certificate_number}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(inst.status)}>
                          {inst.status.toLowerCase() === "active" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {inst.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {inst.organizations?.sector && (
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 flex-shrink-0 text-secondary" />
                          <span className="font-medium">{inst.organizations.sector}</span>
                        </div>
                      )}
                      {(inst.organizations?.city || inst.organizations?.country) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {[inst.organizations?.city, inst.organizations?.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="text-xs">
                          <p className="text-muted-foreground">Registered</p>
                          <p className="font-medium">{format(new Date(inst.issue_date), "dd MMM yyyy")}</p>
                        </div>
                        <div className="text-xs">
                          <p className="text-muted-foreground">Expires</p>
                          <p className={`font-medium ${isExpired(inst.expiry_date) ? "text-destructive" : ""}`}>
                            {format(new Date(inst.expiry_date), "dd MMM yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Scope</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 italic">
                          "{inst.scope}"
                        </p>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary font-bold"
                        onClick={() => setSelectedInstitution(inst)}
                      >
                        View Full Details <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredInstitutions.length === 0 && (
                <div className="text-center py-24 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
                  <Building2 className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold">No Certified Businesses Found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Try adjusting your search query or filters. Only approved certificates are shown here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Certificate Details Dialog */}
        <Dialog open={!!selectedInstitution} onOpenChange={(open) => !open && setSelectedInstitution(null)}>
          <DialogContent className="sm:max-w-[560px] border-none shadow-2xl overflow-hidden p-0">
            {selectedInstitution && (
              <>
                <div className="bg-primary p-8 text-white relative">
                  <BadgeCheck className="absolute top-4 right-4 h-16 w-16 text-white/10" />
                  <h2 className="text-2xl font-bold tracking-tight">
                    {selectedInstitution.organizations?.name || "Certified Business"}
                  </h2>
                  <p className="text-primary-foreground/70 text-sm mt-1">Official AHI Certification Record</p>
                </div>
                <div className="p-8 space-y-5">
                  {/* Status & Certificate */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Certificate Number</p>
                      <p className="font-mono font-bold">{selectedInstitution.certificate_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                      <Badge className={getStatusColor(selectedInstitution.status)}>
                        {selectedInstitution.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Business Info */}
                  {selectedInstitution.organizations && (
                    <div className="border-t pt-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Business Name</p>
                          <p className="font-semibold">{selectedInstitution.organizations.name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Registration No.</p>
                          <p className="font-mono text-sm">{selectedInstitution.organizations.registration_number}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sector</p>
                          <p className="text-sm">{selectedInstitution.organizations.sector}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location</p>
                          <p className="text-sm">
                            {[selectedInstitution.organizations.city, selectedInstitution.organizations.country].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      </div>
                      {selectedInstitution.organizations.address && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Address</p>
                          <p className="text-sm">{selectedInstitution.organizations.address}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {selectedInstitution.organizations.contact_email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{selectedInstitution.organizations.contact_email}</span>
                          </div>
                        )}
                        {selectedInstitution.organizations.contact_phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{selectedInstitution.organizations.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certification Dates */}
                  <div className="border-t pt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Issue Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{format(new Date(selectedInstitution.issue_date), "dd MMMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expiry Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className={`text-sm font-medium ${isExpired(selectedInstitution.expiry_date) ? "text-destructive" : ""}`}>
                            {format(new Date(selectedInstitution.expiry_date), "dd MMMM yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scope */}
                  <div className="border-t pt-5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Certification Scope</p>
                    <p className="text-sm bg-muted/50 p-4 rounded-xl border italic text-muted-foreground leading-relaxed">
                      "{selectedInstitution.scope}"
                    </p>
                  </div>
                </div>
                <DialogFooter className="p-6 bg-muted/50 flex gap-3 sm:gap-0">
                  <Button variant="ghost" className="flex-1 font-bold" onClick={() => setSelectedInstitution(null)}>
                    Close
                  </Button>
                  <Button className="flex-1 font-bold bg-primary shadow-lg shadow-primary/20" asChild>
                    <a href={`/verify?number=${selectedInstitution.certificate_number}`}>
                      Verify Certificate
                    </a>
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </section>

      {/* Info Banner */}
      <section className="py-12 bg-muted">
        <div className="container">
          <Card className="border-none shadow-lg bg-primary text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-2">Want to be listed in our directory?</h3>
              <p className="text-primary-foreground/80 mb-4">
                Get certified by AHI and join our network of trusted Halal-certified businesses.
              </p>
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                <a href="/contact">Apply for Certification</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
