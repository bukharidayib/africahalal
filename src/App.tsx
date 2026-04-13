import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Index from "./pages/Index";
import About from "./pages/About";

import Standards from "./pages/Standards";
import CertificationJourney from "./pages/CertificationJourney";
import Industries from "./pages/Industries";
import Services from "./pages/Services";
import Directory from "./pages/Directory";
import Verify from "./pages/Verify";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import BlogDetail from "./pages/BlogDetail";
import BlogIndex from "./pages/BlogIndex";
import HalalCertificationZambia from "./pages/HalalCertificationZambia";
import HalalCertificationLusaka from "./pages/HalalCertificationLusaka";
import CityLanding from "./pages/CityLanding";
import VerifyHalalCertificate from "./pages/VerifyHalalCertificate";
import DirectoryCategory from "./pages/DirectoryCategory";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";

// Client Auth
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Client Portal
import ClientDashboard from "./pages/client/ClientDashboard";
import CertificationApplication from "./pages/client/CertificationApplication";
import DocumentVault from "./pages/client/DocumentVault";
import ComplianceCenter from "./pages/client/ComplianceCenter";
import ClientInspections from "./pages/client/ClientInspections";
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
import BillingDashboard from "./pages/client/BillingDashboard";
import BillingInvoices from "./pages/client/BillingInvoices";
import BillingInvoiceDetail from "./pages/client/BillingInvoiceDetail";
import MyBusinesses from "./pages/client/MyBusinesses";

// Admin Portal
import { AdminAuthProvider } from "./admin/contexts/AdminAuthContext";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminRegister from "./admin/pages/AdminRegister";
import AdminDashboard from "./admin/pages/AdminDashboard";
import Applications from "./admin/pages/Applications";
import Certificates from "./admin/pages/Certificates";
import Inspections from "./admin/pages/Inspections";
import PendingApprovals from "./admin/pages/PendingApprovals";
import AuditLogs from "./admin/pages/AuditLogs";
import UserManagement from "./admin/pages/UserManagement";
import Supervisors from "./admin/pages/Supervisors";
import Blogs from "./admin/pages/Blogs";
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
import AdminBilling from "./admin/pages/AdminBilling";
import IngredientTracker from "./admin/pages/IngredientTracker";
import AdminSupervisorReportDetail from "./admin/pages/AdminSupervisorReportDetail";

// Supervisor Portal
import { SupervisorProtectedRoute } from "./components/auth/SupervisorProtectedRoute";
import SupervisorSignIn from "./pages/supervisor/SupervisorSignIn";
import SupervisorForgotPassword from "./pages/supervisor/SupervisorForgotPassword";
import SupervisorResetPassword from "./pages/supervisor/SupervisorResetPassword";
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import SupervisorReports from "./pages/supervisor/SupervisorReports";
import SupervisorReportForm from "./pages/supervisor/SupervisorReportForm";
import SupervisorReportDetail from "./pages/supervisor/SupervisorReportDetail";
import SupervisorPerformance from "./pages/supervisor/SupervisorPerformance";
import SupervisorNCRs from "./pages/supervisor/SupervisorNCRs";
import SupervisorNCRDetail from "./pages/supervisor/SupervisorNCRDetail";
import SupervisorIncidents from "./pages/supervisor/SupervisorIncidents";
import SupervisorIncidentForm from "./pages/supervisor/SupervisorIncidentForm";
import SupervisorObservations from "./pages/supervisor/SupervisorObservations";
import SupervisorIngredients from "./pages/supervisor/SupervisorIngredients";
import SupervisorIngredientForm from "./pages/supervisor/SupervisorIngredientForm";
import SupervisorTickets from "./pages/supervisor/SupervisorTickets";
import SupervisorTicketNew from "./pages/supervisor/SupervisorTicketNew";
import SupervisorTicketDetail from "./pages/supervisor/SupervisorTicketDetail";
import SupervisorChat from "./pages/supervisor/SupervisorChat";
import SupervisorRegister from "./pages/supervisor/SupervisorRegister";
import SupervisorInspections from "./pages/supervisor/SupervisorInspections";
import SupervisorInspectionView from "./pages/supervisor/SupervisorInspectionView";

// Inspector Portal
import { InspectorProtectedRoute } from "./components/auth/InspectorProtectedRoute";
import InspectorSignIn from "./pages/inspector/InspectorSignIn";
import InspectorForgotPassword from "./pages/inspector/InspectorForgotPassword";
import InspectorResetPassword from "./pages/inspector/InspectorResetPassword";
import InspectorDashboard from "./pages/inspector/InspectorDashboard";
import InspectorInspections from "./pages/inspector/InspectorInspections";
import InspectorInspectionDetail from "./pages/inspector/InspectorInspectionDetail";
import InspectorNotifications from "./pages/inspector/InspectorNotifications";
import InspectorSupportTickets from "./pages/inspector/InspectorSupportTickets";
import InspectorSupportTicketNew from "./pages/inspector/InspectorSupportTicketNew";
import InspectorSupportTicketDetail from "./pages/inspector/InspectorSupportTicketDetail";
import InspectorSupportChat from "./pages/inspector/InspectorSupportChat";
import InspectorReports from "./pages/inspector/InspectorReports";
import InspectorReportForm from "./pages/inspector/InspectorReportForm";
import InspectorReportDetail from "./pages/inspector/InspectorReportDetail";
import InspectorIncidents from "./pages/inspector/InspectorIncidents";
import InspectorIncidentForm from "./pages/inspector/InspectorIncidentForm";
import InspectorNCRs from "./pages/inspector/InspectorNCRs";
import InspectorNCRDetail from "./pages/inspector/InspectorNCRDetail";
import InspectorObservations from "./pages/inspector/InspectorObservations";
import InspectorManagerSupervisors from "./pages/inspector/InspectorManagerSupervisors";
import InspectorManagerInspections from "./pages/inspector/InspectorManagerInspections";

// Admin Inspection Detail
import AdminInspectionDetail from "./admin/pages/InspectionDetail";

const queryClient = new QueryClient();

function AdminProviderWrapper() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Analytics />
        <SpeedInsights />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            
            <Route path="/standards" element={<Standards />} />
            <Route path="/certification-journey" element={<CertificationJourney />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/services" element={<Services />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/halal-certification-zambia" element={<HalalCertificationZambia />} />
            <Route path="/halal-certification-lusaka" element={<HalalCertificationLusaka />} />
            <Route path="/halal-certification/:city" element={<CityLanding />} />
            <Route path="/verify-halal-certificate" element={<VerifyHalalCertificate />} />
            <Route path="/directory/:category" element={<DirectoryCategory />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failed" element={<PaymentFailed />} />

            {/* Client Auth Routes */}
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/verify-certificate" element={<VerifyPublic />} />

            {/* Client Portal Protected Routes */}
            <Route path="/client/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/businesses" element={<ProtectedRoute><MyBusinesses /></ProtectedRoute>} />
            <Route path="/client/apply" element={<ProtectedRoute><CertificationApplication /></ProtectedRoute>} />
            <Route path="/client/applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
            <Route path="/client/applications/:id" element={<ProtectedRoute><ClientApplicationDetail /></ProtectedRoute>} />
            <Route path="/client/documents" element={<ProtectedRoute><DocumentVault /></ProtectedRoute>} />
            <Route path="/client/inspections" element={<ProtectedRoute><ClientInspections /></ProtectedRoute>} />
            <Route path="/client/compliance" element={<ProtectedRoute><ComplianceCenter /></ProtectedRoute>} />
            <Route path="/client/certificates" element={<ProtectedRoute><CertificateVault /></ProtectedRoute>} />
            <Route path="/client/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />
            <Route path="/client/support/tickets" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
            <Route path="/client/support/tickets/new" element={<ProtectedRoute><SupportTicketNew /></ProtectedRoute>} />
            <Route path="/client/support/tickets/:id" element={<ProtectedRoute><SupportTicketDetail /></ProtectedRoute>} />
            <Route path="/client/support/faq" element={<ProtectedRoute><SupportFAQ /></ProtectedRoute>} />
            <Route path="/client/support/chat" element={<ProtectedRoute><SupportChat /></ProtectedRoute>} />
            <Route path="/client/billing" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
            <Route path="/client/billing/invoices" element={<ProtectedRoute><BillingInvoices /></ProtectedRoute>} />
            <Route path="/client/billing/invoices/:id" element={<ProtectedRoute><BillingInvoiceDetail /></ProtectedRoute>} />

            {/* Admin Portal Routes */}
            <Route path="/admin" element={<AdminProviderWrapper />}>
              <Route path="login" element={<AdminLogin />} />
              <Route path="register" element={<AdminRegister />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="applications" element={<Applications />} />
              <Route path="applications/:id" element={<ApplicationDetail />} />
              <Route path="certificates" element={<Certificates />} />
              <Route path="inspections" element={<Inspections />} />
              <Route path="inspections/:id" element={<AdminInspectionDetail />} />
              <Route path="approvals" element={<PendingApprovals />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="supervisors" element={<Supervisors />} />
              <Route path="blogs" element={<Blogs />} />
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
              <Route path="billing" element={<AdminBilling />} />
              <Route path="ingredients" element={<IngredientTracker />} />
              <Route path="supervisor-reports/:id" element={<AdminSupervisorReportDetail />} />
            </Route>

            {/* Inspector Auth Routes (public) */}
            <Route path="/inspector/signin" element={<InspectorSignIn />} />
            <Route path="/inspector/forgot-password" element={<InspectorForgotPassword />} />
            <Route path="/inspector/reset-password" element={<InspectorResetPassword />} />

            {/* Inspector Portal Protected Routes */}
            <Route path="/inspector/dashboard" element={<InspectorProtectedRoute><InspectorDashboard /></InspectorProtectedRoute>} />
            <Route path="/inspector/inspections" element={<InspectorProtectedRoute><InspectorInspections /></InspectorProtectedRoute>} />
            <Route path="/inspector/inspections/:id" element={<InspectorProtectedRoute><InspectorInspectionDetail /></InspectorProtectedRoute>} />
            <Route path="/inspector/notifications" element={<InspectorProtectedRoute><InspectorNotifications /></InspectorProtectedRoute>} />

            <Route path="/inspector/support/tickets" element={<InspectorProtectedRoute><InspectorSupportTickets /></InspectorProtectedRoute>} />
            <Route path="/inspector/support/tickets/new" element={<InspectorProtectedRoute><InspectorSupportTicketNew /></InspectorProtectedRoute>} />
            <Route path="/inspector/support/tickets/:id" element={<InspectorProtectedRoute><InspectorSupportTicketDetail /></InspectorProtectedRoute>} />
            <Route path="/inspector/support/chat" element={<InspectorProtectedRoute><InspectorSupportChat /></InspectorProtectedRoute>} />
            
            <Route path="/inspector/reports" element={<InspectorProtectedRoute><InspectorReports /></InspectorProtectedRoute>} />
            <Route path="/inspector/reports/new" element={<InspectorProtectedRoute><InspectorReportForm /></InspectorProtectedRoute>} />
            <Route path="/inspector/reports/:id" element={<InspectorProtectedRoute><InspectorReportDetail /></InspectorProtectedRoute>} />
            <Route path="/inspector/incidents" element={<InspectorProtectedRoute><InspectorIncidents /></InspectorProtectedRoute>} />
            <Route path="/inspector/incidents/new" element={<InspectorProtectedRoute><InspectorIncidentForm /></InspectorProtectedRoute>} />
            <Route path="/inspector/ncrs" element={<InspectorProtectedRoute><InspectorNCRs /></InspectorProtectedRoute>} />
            <Route path="/inspector/ncrs/:id" element={<InspectorProtectedRoute><InspectorNCRDetail /></InspectorProtectedRoute>} />
            <Route path="/inspector/observations" element={<InspectorProtectedRoute><InspectorObservations /></InspectorProtectedRoute>} />

            <Route path="/inspector/manager/supervisors" element={<InspectorProtectedRoute><InspectorManagerSupervisors /></InspectorProtectedRoute>} />
            <Route path="/inspector/manager/inspections" element={<InspectorProtectedRoute><InspectorManagerInspections /></InspectorProtectedRoute>} />

            <Route path="/supervisor/signin" element={<SupervisorSignIn />} />
            <Route path="/supervisor/register" element={<SupervisorRegister />} />
            <Route path="/supervisor/forgot-password" element={<SupervisorForgotPassword />} />
            <Route path="/supervisor/reset-password" element={<SupervisorResetPassword />} />

            {/* Supervisor Portal Protected Routes */}
            <Route path="/supervisor/dashboard" element={<SupervisorProtectedRoute><SupervisorDashboard /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/inspections" element={<SupervisorProtectedRoute><SupervisorInspections /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/inspections/:id" element={<SupervisorProtectedRoute><SupervisorInspectionView /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/reports" element={<SupervisorProtectedRoute><SupervisorReports /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/reports/new" element={<SupervisorProtectedRoute><SupervisorReportForm /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/reports/:id" element={<SupervisorProtectedRoute><SupervisorReportDetail /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/performance" element={<SupervisorProtectedRoute><SupervisorPerformance /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/ncrs" element={<SupervisorProtectedRoute><SupervisorNCRs /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/ncrs/:id" element={<SupervisorProtectedRoute><SupervisorNCRDetail /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/incidents" element={<SupervisorProtectedRoute><SupervisorIncidents /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/incidents/new" element={<SupervisorProtectedRoute><SupervisorIncidentForm /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/observations" element={<SupervisorProtectedRoute><SupervisorObservations /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/ingredients" element={<SupervisorProtectedRoute><SupervisorIngredients /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/ingredients/new" element={<SupervisorProtectedRoute><SupervisorIngredientForm /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/support/tickets" element={<SupervisorProtectedRoute><SupervisorTickets /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/support/tickets/new" element={<SupervisorProtectedRoute><SupervisorTicketNew /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/support/tickets/:id" element={<SupervisorProtectedRoute><SupervisorTicketDetail /></SupervisorProtectedRoute>} />
            <Route path="/supervisor/support/chat" element={<SupervisorProtectedRoute><SupervisorChat /></SupervisorProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
