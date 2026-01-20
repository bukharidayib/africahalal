import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Governance from "./pages/Governance";
import Standards from "./pages/Standards";
import CertificationJourney from "./pages/CertificationJourney";
import Industries from "./pages/Industries";
import Services from "./pages/Services";
import Directory from "./pages/Directory";
import Verify from "./pages/Verify";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Admin Portal
import { AdminAuthProvider } from "./admin/contexts/AdminAuthContext";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminDashboard from "./admin/pages/AdminDashboard";
import Applications from "./admin/pages/Applications";
import Certificates from "./admin/pages/Certificates";
import Inspections from "./admin/pages/Inspections";
import PendingApprovals from "./admin/pages/PendingApprovals";
import AuditLogs from "./admin/pages/AuditLogs";
import UserManagement from "./admin/pages/UserManagement";
import Enforcement from "./admin/pages/Enforcement";
import Inspectors from "./admin/pages/Inspectors";
import AdminSettings from "./admin/pages/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/standards" element={<Standards />} />
          <Route path="/certification-journey" element={<CertificationJourney />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/services" element={<Services />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/contact" element={<Contact />} />

          {/* Admin Portal Routes */}
          <Route path="/admin/login" element={
            <AdminAuthProvider>
              <AdminLogin />
            </AdminAuthProvider>
          } />
          <Route path="/admin/dashboard" element={
            <AdminAuthProvider>
              <AdminDashboard />
            </AdminAuthProvider>
          } />
          <Route path="/admin/applications" element={
            <AdminAuthProvider>
              <Applications />
            </AdminAuthProvider>
          } />
          <Route path="/admin/certificates" element={
            <AdminAuthProvider>
              <Certificates />
            </AdminAuthProvider>
          } />
          <Route path="/admin/inspections" element={
            <AdminAuthProvider>
              <Inspections />
            </AdminAuthProvider>
          } />
          <Route path="/admin/approvals" element={
            <AdminAuthProvider>
              <PendingApprovals />
            </AdminAuthProvider>
          } />
          <Route path="/admin/audit-logs" element={
            <AdminAuthProvider>
              <AuditLogs />
            </AdminAuthProvider>
          } />
          <Route path="/admin/users" element={
            <AdminAuthProvider>
              <UserManagement />
            </AdminAuthProvider>
          } />
          <Route path="/admin/enforcement" element={
            <AdminAuthProvider>
              <Enforcement />
            </AdminAuthProvider>
          } />
          <Route path="/admin/inspectors" element={
            <AdminAuthProvider>
              <Inspectors />
            </AdminAuthProvider>
          } />
          <Route path="/admin/settings" element={
            <AdminAuthProvider>
              <AdminSettings />
            </AdminAuthProvider>
          } />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
