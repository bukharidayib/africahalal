import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Home, Briefcase, ShieldCheck, ClipboardCheck, Eye, ArrowRight, Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PortalSuggestion {
  key: string;
  name: string;
  description: string;
  href: string;
  icon: typeof Home;
  prefix?: string;
}

const PORTALS: PortalSuggestion[] = [
  {
    key: "home",
    name: "Public Website",
    description: "Browse certified businesses, services, and verify halal certificates.",
    href: "/",
    icon: Home,
  },
  {
    key: "client",
    name: "Client Portal",
    description: "Manage your business applications, documents, and certificates.",
    href: "/auth/signin",
    icon: Briefcase,
    prefix: "/client",
  },
  {
    key: "admin",
    name: "Admin Portal",
    description: "Certification officers and admins manage applications and users.",
    href: "/admin/login",
    icon: ShieldCheck,
    prefix: "/admin",
  },
  {
    key: "inspector",
    name: "Inspector Portal",
    description: "Inspectors complete on-site checklists, reports, and incidents.",
    href: "/inspector/signin",
    icon: ClipboardCheck,
    prefix: "/inspector",
  },
  {
    key: "supervisor",
    name: "Supervisor Portal",
    description: "Supervisors monitor sites, ingredients, and compliance reports.",
    href: "/supervisor/signin",
    icon: Eye,
    prefix: "/supervisor",
  },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const suggested = useMemo(() => {
    return PORTALS.find((p) => p.prefix && location.pathname.startsWith(p.prefix));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-5xl font-bold tracking-tight">Page not found</h1>
          <p className="mx-auto mb-2 max-w-xl text-muted-foreground">
            We couldn&apos;t find a page at:
          </p>
          <code className="inline-block rounded bg-muted px-3 py-1 text-sm font-mono text-foreground">
            {location.pathname || "/"}
          </code>
        </div>

        {suggested && (
          <Card className="mx-auto mt-8 max-w-2xl border-primary/30 bg-primary/5">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <suggested.icon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Did you mean the {suggested.name}?</CardTitle>
                <CardDescription>{suggested.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={suggested.href}>
                  Go to {suggested.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-12">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Choose a destination
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              return (
                <Card
                  key={portal.key}
                  className="group flex flex-col transition-shadow hover:shadow-md"
                >
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{portal.name}</CardTitle>
                    <CardDescription>{portal.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button asChild variant="outline" className="w-full">
                      <Link to={portal.href}>
                        Open
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
