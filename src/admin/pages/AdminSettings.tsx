import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Globe,
  Database,
  Key,
  Save,
  Mail,
  Clock,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { permissions } = useAdminAuthContext();
  const [isSaving, setIsSaving] = useState(false);

  // General settings
  const [organizationName, setOrganizationName] = useState('African Halal Institute & Standards');
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [applicationAlerts, setApplicationAlerts] = useState(true);
  const [ncnAlerts, setNCNAlerts] = useState(true);
  const [expiryReminders, setExpiryReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState('30');

  // Security settings
  const [requireMFA, setRequireMFA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [ipWhitelist, setIPWhitelist] = useState('');

  async function handleSave() {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    setIsSaving(false);
  }

  if (!permissions.canManageSettings) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access settings.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Settings</h1>
            <p className="text-muted-foreground">
              Configure system preferences and security policies
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization
                </CardTitle>
                <CardDescription>
                  Basic organization and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Nairobi">East Africa (UTC+3)</SelectItem>
                        <SelectItem value="Africa/Lagos">West Africa (UTC+1)</SelectItem>
                        <SelectItem value="Africa/Cairo">Egypt (UTC+2)</SelectItem>
                        <SelectItem value="Africa/Johannesburg">South Africa (UTC+2)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Information
                </CardTitle>
                <CardDescription>
                  Database and system status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Database</Label>
                    <p className="font-medium">Supabase PostgreSQL</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Version</Label>
                    <p className="font-medium">AHI v1.0.0</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Environment</Label>
                    <p className="font-medium">Production</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Backup</Label>
                    <p className="font-medium">Today, 03:00 AM</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Configure email alerts for system events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable email notifications for admin users
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Application Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        New submissions and status changes
                      </p>
                    </div>
                    <Switch
                      checked={applicationAlerts}
                      onCheckedChange={setApplicationAlerts}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>NCN Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Non-conformance notices and deadlines
                      </p>
                    </div>
                    <Switch
                      checked={ncnAlerts}
                      onCheckedChange={setNCNAlerts}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Certificate Expiry Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify before certificates expire
                      </p>
                    </div>
                    <Switch
                      checked={expiryReminders}
                      onCheckedChange={setExpiryReminders}
                      disabled={!emailNotifications}
                    />
                  </div>
                </div>

                {expiryReminders && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="reminder-days">Reminder Days Before Expiry</Label>
                      <Select value={reminderDays} onValueChange={setReminderDays}>
                        <SelectTrigger id="reminder-days" className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Authentication
                </CardTitle>
                <CardDescription>
                  Configure security and authentication policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Enforce MFA for all admin users
                    </p>
                  </div>
                  <Switch
                    checked={requireMFA}
                    onCheckedChange={setRequireMFA}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger id="session-timeout" className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out inactive users after this period
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  IP Restrictions
                </CardTitle>
                <CardDescription>
                  Limit admin access to specific IP addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ip-whitelist">IP Whitelist</Label>
                  <Input
                    id="ip-whitelist"
                    placeholder="192.168.1.0/24, 10.0.0.1"
                    value={ipWhitelist}
                    onChange={(e) => setIPWhitelist(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of allowed IP addresses or CIDR ranges. Leave empty to allow all.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Security Best Practices</p>
                    <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                      <li>Enable MFA for all administrative accounts</li>
                      <li>Use strong, unique passwords</li>
                      <li>Review audit logs regularly</li>
                      <li>Limit session timeout to reduce risk</li>
                      <li>Restrict IP access when possible</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
