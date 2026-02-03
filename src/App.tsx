import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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

// Client Auth
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Client Portal
import ClientDashboard from "./pages/client/ClientDashboard";
import CertificationApplication from "./pages/client/CertificationApplication";
import DocumentVault from "./pages/client/DocumentVault";
import ComplianceCenter from "./pages/client/ComplianceCenter";
import CertificateVault from "./pages/client/CertificateVault";
import VerifyPublic from "./pages/VerifyPublic";
import MyApplications from "./pages/client/MyApplications";
import ClientApplicationDetail from "./pages/client/ClientApplicationDetail";
import SupportCenter from "./pages/client/SupportCenter";
import SupportTickets from "./pages/client/SupportTickets";
import SupportTicketNew from "./pages/client/SupportTicketNew";
import SupportTicketDetail from "./pages/client/SupportTicketDetail";
import SupportFAQ from "./pages/client/SupportFAQ";
import SupportChat from "./pages/client/SupportChat";

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
import ApplicationDetail from "./admin/pages/ApplicationDetail";
import AdminSupportCenter from "./admin/pages/AdminSupportCenter";
import AdminSupportTickets from "./admin/pages/AdminSupportTickets";
import AdminSupportTicketDetail from "./admin/pages/AdminSupportTicketDetail";
import AdminSupportChats from "./admin/pages/AdminSupportChats";
import AdminSupportChatSession from "./admin/pages/AdminSupportChatSession";
import RolesPermissions from "./admin/pages/RolesPermissions";
import RoleEditor from "./admin/pages/RoleEditor";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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

          {/* Client Auth Routes */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-certificate" element={<VerifyPublic />} />

          {/* Client Portal Protected Routes */}
          <Route path="/client/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
          <Route path="/client/apply" element={<ProtectedRoute><CertificationApplication /></ProtectedRoute>} />
          <Route path="/client/applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
          <Route path="/client/applications/:id" element={<ProtectedRoute><ClientApplicationDetail /></ProtectedRoute>} />
          <Route path="/client/documents" element={<ProtectedRoute><DocumentVault /></ProtectedRoute>} />
          <Route path="/client/inspections" element={<ProtectedRoute><ComplianceCenter /></ProtectedRoute>} />
          <Route path="/client/certificates" element={<ProtectedRoute><CertificateVault /></ProtectedRoute>} />
          <Route path="/client/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />
          <Route path="/client/support/tickets" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
          <Route path="/client/support/tickets/new" element={<ProtectedRoute><SupportTicketNew /></ProtectedRoute>} />
          <Route path="/client/support/tickets/:id" element={<ProtectedRoute><SupportTicketDetail /></ProtectedRoute>} />
          <Route path="/client/support/faq" element={<ProtectedRoute><SupportFAQ /></ProtectedRoute>} />
          <Route path="/client/support/chat" element={<ProtectedRoute><SupportChat /></ProtectedRoute>} />

          {/* Admin Portal Routes - Single Provider wrapping all admin routes */}
          <Route path="/admin/*" element={
            <AdminAuthProvider>
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="applications" element={<Applications />} />
                <Route path="applications/:id" element={<ApplicationDetail />} />
                <Route path="certificates" element={<Certificates />} />
                <Route path="inspections" element={<Inspections />} />
                <Route path="approvals" element={<PendingApprovals />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="enforcement" element={<Enforcement />} />
                <Route path="inspectors" element={<Inspectors />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="support" element={<AdminSupportCenter />} />
                <Route path="support/tickets" element={<AdminSupportTickets />} />
                <Route path="support/tickets/:id" element={<AdminSupportTicketDetail />} />
                <Route path="support/chats" element={<AdminSupportChats />} />
                <Route path="support/chats/:id" element={<AdminSupportChatSession />} />
                <Route path="roles" element={<RolesPermissions />} />
                <Route path="roles/:id" element={<RoleEditor />} />
              </Routes>
            </AdminAuthProvider>
          } />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
