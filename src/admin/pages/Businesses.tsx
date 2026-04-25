import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, Eye, Loader2 } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessRow {
  id: string;
  entity_name: string;
  pacra_number: string;
  user_id: string;
  organization_id: string | null;
  created_at: string;
  owner_email?: string | null;
  owner_name?: string | null;
  active_certs?: number;
  open_apps?: number;
  outstanding?: number;
}

export default function Businesses() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: bizs, error } = await supabase
        .from('client_businesses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (bizs || []) as BusinessRow[];

      const userIds = Array.from(new Set(list.map((b) => b.user_id).filter(Boolean)));
      const orgIds = Array.from(new Set(list.map((b) => b.organization_id).filter(Boolean) as string[]));

      const [{ data: profiles }, { data: certs }, { data: apps }, { data: invs }] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id, email, full_name').in('id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('certificates').select('organization_id, status').in('organization_id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
        list.length
          ? supabase.from('certification_applications').select('id, business_id, organization_id, status').in('business_id', list.map((b) => b.id))
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('invoices').select('organization_id, amount, total, status').in('organization_id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const certByOrg = new Map<string, number>();
      (certs || []).forEach((c: any) => {
        if (c.status === 'active') certByOrg.set(c.organization_id, (certByOrg.get(c.organization_id) || 0) + 1);
      });
      const appsByBiz = new Map<string, number>();
      (apps || []).forEach((a: any) => {
        if (!['expired', 'rejected', 'withdrawn'].includes(a.status)) {
          appsByBiz.set(a.business_id, (appsByBiz.get(a.business_id) || 0) + 1);
        }
      });
      const outByOrg = new Map<string, number>();
      (invs || []).forEach((i: any) => {
        if (i.status !== 'paid' && i.status !== 'cancelled') {
          outByOrg.set(i.organization_id, (outByOrg.get(i.organization_id) || 0) + Number(i.total || i.amount || 0));
        }
      });

      const enriched = list.map((b) => {
        const p: any = profileMap.get(b.user_id);
        return {
          ...b,
          owner_email: p?.email || null,
          owner_name: p?.full_name || null,
          active_certs: b.organization_id ? (certByOrg.get(b.organization_id) || 0) : 0,
          open_apps: appsByBiz.get(b.id) || 0,
          outstanding: b.organization_id ? (outByOrg.get(b.organization_id) || 0) : 0,
        };
      });
      setRows(enriched);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.entity_name?.toLowerCase().includes(s) ||
      r.pacra_number?.toLowerCase().includes(s) ||
      r.owner_email?.toLowerCase().includes(s),
    );
  }, [rows, search]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Businesses
          </h1>
          <p className="text-muted-foreground">Unified hub for every certified business — applications, certificates, invoices, documents and history.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, PACRA #, or owner email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No businesses found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>PACRA #</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Active Certs</TableHead>
                    <TableHead>Open Apps</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.entity_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.pacra_number}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{r.owner_name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{r.owner_email || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.active_certs ? 'default' : 'outline'}>{r.active_certs}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.open_apps ? 'secondary' : 'outline'}>{r.open_apps}</Badge>
                      </TableCell>
                      <TableCell className={r.outstanding ? 'text-destructive font-semibold' : ''}>
                        {r.outstanding ? `ZMW ${r.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/businesses/${r.id}`}><Eye className="h-4 w-4 mr-1" /> Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
