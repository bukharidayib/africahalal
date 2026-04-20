import { useEffect, useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Filter,
  Building2,
  BadgeCheck,
  Loader2
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { supabase } from "@/integrations/supabase/client";

const sectors = ["All Sectors", "Restuarents & Coffee", "Abbatoirs", "Meat Processing", "Hospitality", "Manufacturies"];
const statuses = ["All Status", "Active", "Expired", "Suspended"];

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  async function fetchInstitutions() {
    setIsLoading(true);
    try {
      // Fetch certificates joined with organizations
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          status,
          scope,
          issue_date,
          organizations (
            name,
            address
          )
        `)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Error fetching directory:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredInstitutions = institutions.filter((inst) => {
    const orgName = inst.organizations?.name || "";
    const orgAddress = inst.organizations?.address || "";

    const matchesSearch = orgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orgAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.certificate_number.toLowerCase().includes(searchQuery.toLowerCase());

    // For now we don't have a rigid 'sector' field in orgs, so we match against scope or defaults
    const matchesSector = selectedSector === "All Sectors" || inst.scope.toLowerCase().includes(selectedSector.toLowerCase());
    const matchesStatus = selectedStatus === "All Status" || inst.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesSector && matchesStatus;
  });

  return (
    <Layout>
      <HeroSection
        subtitle="Certified Directory"
        title="Global Certified Registry"
        description="Explore our network of certified businesses across Africa and beyond. Verify their Halal certification status and scope."
        size="md"
      />

      {/* Search & Filters */}
      <section className="py-8 bg-muted border-b">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, location, or certificate ID..."
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
            Showing {filteredInstitutions.length} of {institutions.length} certified institutions
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
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg leading-tight">
                              {inst.organizations?.name || "Private Entity"}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">{inst.certificate_number}</p>
                          </div>
                        </div>
                        <Badge
                          variant={inst.status.toLowerCase() === "active" ? "default" : "secondary"}
                          className={inst.status.toLowerCase() === "active" ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {inst.status.toLowerCase() === "active" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {inst.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{inst.organizations?.address || "Location TBD"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        Issued {new Date(inst.issue_date).toLocaleDateString()}
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Scope</p>
                        <p className="text-sm text-slate-600 line-clamp-2 italic">
                          "{inst.scope}"
                        </p>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary font-bold"
                        onClick={() => setSelectedInstitution(inst)}
                      >
                        Verify Full Details <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredInstitutions.length === 0 && (
                <div className="text-center py-24 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
                  <Building2 className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-slate-800">No Certified Entities Found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Try adjusting your search query or filters. Only registered certificates are shown here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Certificate Details Dialog */}
        <Dialog open={!!selectedInstitution} onOpenChange={(open) => !open && setSelectedInstitution(null)}>
          <DialogContent className="sm:max-w-[500px] border-none shadow-2xl overflow-hidden p-0">
            {selectedInstitution && (
              <>
                <div className="bg-primary p-8 text-white relative">
                  <BadgeCheck className="absolute top-4 right-4 h-16 w-16 text-white/10" />
                  <h2 className="text-3xl font-bold tracking-tight">Verified Status</h2>
                  <p className="text-primary-foreground/70">Official AHI Certification Record</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Certificate Number</p>
                      <p className="font-mono font-bold text-slate-800">{selectedInstitution.certificate_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Status</p>
                      <Badge className={selectedInstitution.status.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-slate-400'}>
                        {selectedInstitution.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 border-t pt-6">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Institution Name</p>
                    <p className="text-lg font-bold text-slate-800">{selectedInstitution.organizations?.name}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Official Scope</p>
                    <p className="text-sm bg-muted/50 p-4 rounded-xl border italic text-slate-600 leading-relaxed">
                      "{selectedInstitution.scope}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <Calendar className="h-4 w-4" />
                    <span>Certification active since {new Date(selectedInstitution.issue_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 flex gap-3 sm:gap-0">
                  <Button variant="ghost" className="flex-1 font-bold" onClick={() => setSelectedInstitution(null)}>
                    Close
                  </Button>
                  <Button className="flex-1 font-bold bg-primary shadow-lg shadow-primary/20" asChild>
                    <a href={`/verify?number=${selectedInstitution.certificate_number}`}>
                      View Full Certificate
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
