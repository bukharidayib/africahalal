import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ChevronRight,
  Building2,
  Calendar,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { CertificateDownloader } from '@/components/certificate/CertificateDownloader';

type CertificateStatus = 'active' | 'suspended' | 'revoked' | 'expired';

interface Certificate {
  id: string;
  certificate_number: string;
  scope: string;
  issue_date: string;
  expiry_date: string;
  status: CertificateStatus;
  created_at: string;
  organizations?: {
    name: string;
    registration_number: string;
  };
}

const statusConfig: Record<CertificateStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<any> }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  suspended: { label: 'Suspended', variant: 'secondary', icon: Clock },
  revoked: { label: 'Revoked', variant: 'destructive', icon: XCircle },
  expired: { label: 'Expired', variant: 'outline', icon: AlertTriangle },
};

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchCertificates();
  }, [statusFilter]);

  async function fetchCertificates() {
    try {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          organizations (
            name,
            registration_number
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCertificates = certificates.filter(cert => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      cert.certificate_number.toLowerCase().includes(search) ||
      cert.organizations?.name.toLowerCase().includes(search) ||
      cert.scope.toLowerCase().includes(search)
    );
  });

  const getExpiryInfo = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { text: 'Expired', className: 'text-destructive' };
    if (days < 30) return { text: `${days} days`, className: 'text-amber-600' };
    if (days < 90) return { text: `${days} days`, className: 'text-amber-500' };
    return { text: `${days} days`, className: 'text-muted-foreground' };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Certificates</h1>
            <p className="text-muted-foreground">
              Manage issued certificates
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {certificates.filter(c => c.status === 'active').length}
              </div>
              <p className="text-sm text-muted-foreground">Active Certificates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {certificates.filter(c => {
                  const days = differenceInDays(new Date(c.expiry_date), new Date());
                  return days >= 0 && days < 90;
                }).length}
              </div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {certificates.filter(c => c.status === 'suspended').length}
              </div>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {certificates.filter(c => c.status === 'revoked').length}
              </div>
              <p className="text-sm text-muted-foreground">Revoked</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by certificate number, organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredCertificates.length} Certificate{filteredCertificates.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading certificates...
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No certificates found</h3>
                <p className="text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Certificates will appear here once issued'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.map((cert) => {
                    const status = statusConfig[cert.status];
                    const StatusIcon = status.icon;
                    const expiryInfo = getExpiryInfo(cert.expiry_date);

                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                            {cert.certificate_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{cert.organizations?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {cert.scope}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(cert.issue_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className={expiryInfo.className}>
                              {format(new Date(cert.expiry_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CertificateDownloader
                              certificateId={cert.id}
                              certificateNumber={cert.certificate_number}
                              institutionName={cert.organizations?.name || 'Unknown'}
                              scope={cert.scope}
                              issueDate={format(new Date(cert.issue_date), 'dd MMM yyyy')}
                              expiryDate={format(new Date(cert.expiry_date), 'dd MMM yyyy')}
                              variant="ghost"
                              showIcon={true}
                              label=""
                              className="h-8 w-8 p-0"
                            />
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                              <Link to={`/admin/certificates/${cert.id}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
