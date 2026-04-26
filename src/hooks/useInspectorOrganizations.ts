import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InspectorOrg { id: string; name: string }

/**
 * Loads the list of organizations (businesses) assigned to the currently
 * signed-in inspector. Resolves the inspector record by user_id, then
 * fetches inspector_organizations joined to organizations.
 */
export function useInspectorOrganizations() {
  const [organizations, setOrganizations] = useState<InspectorOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setIsLoading(false); return; }

        // 1. Resolve the inspector record for this user
        const { data: inspectorRow } = await supabase
          .from("inspectors")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!inspectorRow?.id) {
          if (!cancelled) { setOrganizations([]); setIsLoading(false); }
          return;
        }

        // 2. Fetch assigned organizations
        const { data: assignments } = await supabase
          .from("inspector_organizations")
          .select("organization_id, organizations:organization_id(id, name)")
          .eq("inspector_id", inspectorRow.id);

        const orgs: InspectorOrg[] = ((assignments as any[]) || [])
          .map((a) => a.organizations)
          .filter((o: any) => o && o.id)
          .map((o: any) => ({ id: o.id, name: o.name }));

        if (!cancelled) { setOrganizations(orgs); setIsLoading(false); }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { organizations, isLoading };
}
