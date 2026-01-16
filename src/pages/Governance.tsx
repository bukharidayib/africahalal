import { 
  Shield, 
  Scale, 
  Users, 
  Building,
  BookOpen,
  Gavel,
  Eye,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { SectionHeader } from "@/components/sections/SectionHeader";

const governancePhilosophy = [
  { icon: Shield, title: "Integrity First", description: "Every decision upholds the highest ethical standards" },
  { icon: Scale, title: "Fair & Impartial", description: "Unbiased certification processes for all applicants" },
  { icon: Eye, title: "Transparency", description: "Open procedures and clear communication" },
  { icon: Lock, title: "Independence", description: "Free from external commercial pressures" },
];

const structure = [
  { 
    title: "Board of Directors", 
    description: "Strategic oversight and institutional governance",
    members: 7
  },
  { 
    title: "Shariah Supervisory Board", 
    description: "Islamic jurisprudence and Halal compliance oversight",
    members: 5
  },
  { 
    title: "Technical Committee", 
    description: "Standards development and certification procedures",
    members: 8
  },
  { 
    title: "Audit & Compliance", 
    description: "Internal audits and quality assurance",
    members: 4
  },
];

const shariahBoard = [
  {
    name: "Sheikh Dr. Abdullah Rahman",
    title: "Chairman, Shariah Supervisory Board",
    credentials: "PhD in Islamic Jurisprudence, Al-Azhar University",
    expertise: "Halal food science, Islamic finance",
  },
  {
    name: "Mufti Hassan Ibrahim",
    title: "Deputy Chairman",
    credentials: "Graduate of Darul Uloom, 30+ years experience",
    expertise: "Fiqh of trade, Halal certification",
  },
  {
    name: "Dr. Aisha Osman",
    title: "Board Member",
    credentials: "PhD in Food Science, Islamic Studies certification",
    expertise: "Food technology, ingredient analysis",
  },
  {
    name: "Sheikh Yusuf Mensah",
    title: "Board Member",
    credentials: "Masters in Shariah, University of Madinah",
    expertise: "Halal slaughter procedures, meat processing",
  },
  {
    name: "Dr. Fatima Al-Rashid",
    title: "Board Member",
    credentials: "PhD in Biochemistry, Islamic Finance certification",
    expertise: "Pharmaceutical Halal, cosmetics standards",
  },
];

export default function Governance() {
  return (
    <Layout>
      {/* Hero */}
      <HeroSection
        subtitle="Governance & Authority"
        title="Institutional Excellence Through Strong Governance"
        description="Our governance framework ensures every certification decision is made with integrity, independence, and unwavering commitment to Shariah principles."
        size="lg"
      />

      {/* Governance Philosophy */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="Our Approach"
            title="Governance Philosophy"
            description="The foundational principles that guide our institutional operations."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {governancePhilosophy.map((item) => (
              <div
                key={item.title}
                className="text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Structure */}
      <section className="section-padding bg-muted">
        <div className="container">
          <SectionHeader
            subtitle="Organization"
            title="Institutional Structure"
            description="A multi-tiered governance framework ensuring comprehensive oversight and expertise."
          />
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {structure.map((item) => (
              <Card key={item.title} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <span className="text-sm bg-secondary/10 text-secondary px-3 py-1 rounded-full">
                      {item.members} Members
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Shariah Supervisory Board */}
      <section className="section-padding bg-background">
        <div className="container">
          <SectionHeader
            subtitle="Shariah Authority"
            title="Shariah Supervisory Board"
            description="Distinguished Islamic scholars ensuring all certifications comply with Shariah principles."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shariahBoard.map((member) => (
              <Card key={member.name} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <p className="text-sm text-secondary font-medium">{member.title}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Credentials</p>
                    <p className="text-sm">{member.credentials}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Expertise</p>
                    <p className="text-sm">{member.expertise}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Independence Statement */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container max-w-4xl">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Gavel className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Our Independence Statement
            </h2>
            <div className="space-y-4 text-primary-foreground/90 text-left">
              <p>
                The African Halal Institute maintains strict independence in all certification 
                decisions. Our governance framework ensures that commercial considerations never 
                influence the integrity of our certification processes.
              </p>
              <p>
                All certification decisions are made by qualified personnel operating under the 
                oversight of our Shariah Supervisory Board. We maintain clear separation between 
                certification activities and any commercial or marketing functions.
              </p>
              <p>
                Our auditors and inspectors are bound by strict codes of conduct, and we implement 
                robust conflict of interest policies to ensure impartiality in every assessment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Framework */}
      <section className="section-padding bg-background">
        <div className="container max-w-4xl">
          <SectionHeader
            subtitle="Our Standards"
            title="Compliance Framework"
            description="We operate under multiple layers of compliance to ensure the highest standards."
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <BookOpen className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Shariah Standards</h3>
              <p className="text-muted-foreground text-sm">
                All certifications comply with established Islamic jurisprudence and 
                internationally recognized Halal standards.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Building className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">ISO Accreditation</h3>
              <p className="text-muted-foreground text-sm">
                Our processes are aligned with ISO/IEC 17065 requirements for 
                certification bodies.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Scale className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">National Regulations</h3>
              <p className="text-muted-foreground text-sm">
                We comply with relevant national food safety and trade regulations 
                in all countries of operation.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Eye className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Internal Audits</h3>
              <p className="text-muted-foreground text-sm">
                Regular internal audits ensure continuous improvement and 
                adherence to our quality management system.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
