import { useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Filter,
  Building2,
  BadgeCheck
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

const certifiedInstitutions = [
  {
    id: "AHI-2023-0001",
    name: "Fresh Foods Manufacturing Ltd",
    location: "Johannesburg, South Africa",
    sector: "Food & Beverage",
    certifiedSince: 2019,
    status: "Active",
    scope: "Processed foods, beverages",
  },
  {
    id: "AHI-2023-0002",
    name: "Sahara Halal Meats",
    location: "Nairobi, Kenya",
    sector: "Abattoirs & Meat",
    certifiedSince: 2020,
    status: "Active",
    scope: "Poultry slaughter and processing",
  },
  {
    id: "AHI-2023-0003",
    name: "Golden Crescent Hotel",
    location: "Cairo, Egypt",
    sector: "Hospitality",
    certifiedSince: 2021,
    status: "Active",
    scope: "Hotel F&B operations",
  },
  {
    id: "AHI-2023-0004",
    name: "Nile Valley Foods",
    location: "Lagos, Nigeria",
    sector: "Food & Beverage",
    certifiedSince: 2018,
    status: "Active",
    scope: "Dairy products, confectionery",
  },
  {
    id: "AHI-2023-0005",
    name: "Cape Halal Abattoir",
    location: "Cape Town, South Africa",
    sector: "Abattoirs & Meat",
    certifiedSince: 2017,
    status: "Active",
    scope: "Cattle and sheep slaughter",
  },
  {
    id: "AHI-2023-0006",
    name: "Medina Restaurant Group",
    location: "Casablanca, Morocco",
    sector: "Hospitality",
    certifiedSince: 2022,
    status: "Active",
    scope: "Restaurant chain operations",
  },
  {
    id: "AHI-2022-0007",
    name: "Atlas Pharmaceuticals",
    location: "Accra, Ghana",
    sector: "Pharmaceuticals",
    certifiedSince: 2021,
    status: "Active",
    scope: "Oral medications, supplements",
  },
  {
    id: "AHI-2022-0008",
    name: "Zambezi Logistics",
    location: "Lusaka, Zambia",
    sector: "Logistics",
    certifiedSince: 2020,
    status: "Active",
    scope: "Cold chain and storage",
  },
];

const sectors = ["All Sectors", "Food & Beverage", "Abattoirs & Meat", "Hospitality", "Pharmaceuticals", "Logistics"];
const statuses = ["All Status", "Active", "Pending Renewal", "Suspended"];

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedInstitution, setSelectedInstitution] = useState<typeof certifiedInstitutions[0] | null>(null);

  const filteredInstitutions = certifiedInstitutions.filter((inst) => {
    const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === "All Sectors" || inst.sector === selectedSector;
    const matchesStatus = selectedStatus === "All Status" || inst.status === selectedStatus;
    return matchesSearch && matchesSector && matchesStatus;
  });

  return (
    <Layout>
      {/* Hero */}
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
            Showing {filteredInstitutions.length} of {certifiedInstitutions.length} certified institutions
          </p>
        </div>
      </section>

      {/* Directory Grid */}
      <section className="section-padding bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInstitutions.map((inst) => (
              <Card key={inst.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg leading-tight">{inst.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{inst.id}</p>
                      </div>
                    </div>
                    <Badge variant={inst.status === "Active" ? "default" : "secondary"} className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {inst.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {inst.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    Certified since {inst.certifiedSince}
                  </div>
                  <div>
                    <Badge variant="outline">{inst.sector}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Scope:</span> {inst.scope}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={() => setSelectedInstitution(inst)}
                  >
                    View Certificate Details <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInstitutions.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find certified institutions.
              </p>
            </div>
          )}
        </div>

        {/* Certificate Details Dialog */}
        <Dialog open={!!selectedInstitution} onOpenChange={(open) => !open && setSelectedInstitution(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <BadgeCheck className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Certificate Details</DialogTitle>
              <DialogDescription>
                Official verification details for this institution's Halal certification.
              </DialogDescription>
            </DialogHeader>
            {selectedInstitution && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Certificate ID</p>
                    <p className="font-mono text-sm">{selectedInstitution.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {selectedInstitution.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Institution</p>
                    <p className="text-sm font-semibold">{selectedInstitution.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Location</p>
                    <p className="text-sm">{selectedInstitution.location}</p>
                  </div>
                </div>

                <div className="space-y-1 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Industry Sector</p>
                  <p className="text-sm">{selectedInstitution.sector}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Scope of Certification</p>
                  <p className="text-sm bg-muted p-3 rounded-lg border italic">
                    "{selectedInstitution.scope}"
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
                  <Calendar className="h-3 w-3" />
                  <span>Certified since {selectedInstitution.certifiedSince}</span>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedInstitution(null)}>
                Close
              </Button>
              <Button className="flex-1" asChild>
                <a href={`/verify?id=${selectedInstitution?.id}`}>
                  View Full Certificate
                </a>
              </Button>
            </DialogFooter>
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
