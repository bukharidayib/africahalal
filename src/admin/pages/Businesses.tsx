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

type SubStatus = 'active' | 'expiring' | 'expired' | 'none';

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
  days_to_expiry?: number | null;
  sub_status?: SubStatus;
}

const FILTERS: { key: 'all' | SubStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring ≤30d' },
  { key: 'expired', label: 'Expired' },
  { key: 'none', label: 'No certificate' },
];

export default function Businesses() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | SubStatus>('all');

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
          ? supabase.from('certificates').select('organization_id, status, expiry_date').in('organization_id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
        list.length
          ? supabase.from('certification_applications').select('id, business_id, organization_id, status').in('business_id', list.map((b) => b.id))
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('invoices').select('organization_id, amount, total, status').in('organization_id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const activeCertByOrg = new Map<string, number>();
      const latestExpiryByOrg = new Map<string, string>();
      (certs || []).forEach((c: any) => {
        if (c.status === 'active') {
          activeCertByOrg.set(c.organization_id, (activeCertByOrg.get(c.organization_id) || 0) + 1);
          const cur = latestExpiryByOrg.get(c.organization_id);
          if (!cur || new Date(c.expiry_date) > new Date(cur)) {
            latestExpiryByOrg.set(c.organization_id, c.expiry_date);
          }
        }
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

      const enriched: BusinessRow[] = list.map((b) => {
        const p: any = profileMap.get(b.user_id);
        const orgId = b.organization_id || '';
        const expiry = latestExpiryByOrg.get(orgId);
        const activeCount = orgId ? (activeCertByOrg.get(orgId) || 0) : 0;
        let subStatus: SubStatus = 'none';
        let daysToExpiry: number | null = null;
        if (activeCount > 0 && expiry) {
          daysToExpiry = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
          if (daysToExpiry < 0) subStatus = 'expired';
          else if (daysToExpiry <= 30) subStatus = 'expiring';
          else subStatus = 'active';
        }
        return {
          ...b,
          owner_email: p?.email || null,
          owner_name: p?.full_name || null,
          active_certs: activeCount,
          open_apps: appsByBiz.get(b.id) || 0,
          outstanding: orgId ? (outByOrg.get(orgId) || 0) : 0,
          days_to_expiry: daysToExpiry,
          sub_status: subStatus,
        };
      });
      setRows(enriched);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, active: 0, expiring: 0, expired: 0, none: 0 };
    rows.forEach((r) => { if (r.sub_status) c[r.sub_status]++; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== 'all') list = list.filter((r) => r.sub_status === filter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) =>
        r.entity_name?.toLowerCase().includes(s) ||
        r.pacra_number?.toLowerCase().includes(s) ||
        r.owner_email?.toLowerCase().includes(s),
      );
    }
    return list;
  }, [rows, search, filter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Businesses
          </h1>
          <p className="text-muted-foreground">Unified hub for every certified business — applications, certificates, subscriptions, invoices, documents and history.</p>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, PACRA #, or owner email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  variant={filter === f.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className="ml-2 opacity-70 text-xs">{counts[f.key] ?? 0}</span>
                </Button>
              ))}
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
                    <TableHead>Subscription</TableHead>
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
                        <SubBadge status={r.sub_status} days={r.days_to_expiry} />
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

function SubBadge({ status, days }: { status?: SubStatus; days?: number | null }) {
  if (!status || status === 'none') return <Badge variant="outline">No cert</Badge>;
  if (status === 'expired') return <Badge variant="destructive">Expired</Badge>;
  if (status === 'expiring') return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Expiring · {days}d</Badge>;
  return <Badge>Active · {days}d</Badge>;
}
