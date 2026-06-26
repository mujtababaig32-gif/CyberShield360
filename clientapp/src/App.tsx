import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import AiCopilot from "./pages/AiCopilot";
import AiRemediation from "./pages/AiRemediation";
import AssetInventory from "./pages/AssetInventory";
import Assets from "./pages/Assets";
import AttackPath from "./pages/AttackPath";
import AuditLogs from "./pages/AuditLogs";
import Billing from "./pages/Billing";
import ClientOnboarding from "./pages/ClientOnboarding";
import ClientPackages from "./pages/ClientPackages";
import ClientQuotation from "./pages/ClientQuotation";
import ClientTraining from "./pages/ClientTraining";
import CloudPosture from "./pages/CloudPosture";
import ComplianceCenter from "./pages/ComplianceCenter";
import DarkWebMonitoring from "./pages/DarkWebMonitoring";
import Dashboard from "./pages/Dashboard";
import ExecutiveScorecard from "./pages/ExecutiveScorecard";
import FixPlan from "./pages/FixPlan";
import FrameworkMapping from "./pages/FrameworkMapping";
import GlobalSearch from "./pages/GlobalSearch";
import GoogleAuth from "./pages/GoogleAuth";
import IncidentPlaybook from "./pages/IncidentPlaybook";
import Login from "./pages/Login";
import MicrosoftAuth from "./pages/MicrosoftAuth";
import NotificationsCenter from "./pages/NotificationsCenter";
import PhishingSimulation from "./pages/PhishingSimulation";
import PolicyAudit from "./pages/PolicyAudit";
import Profile from "./pages/Profile";
import Rbac from "./pages/Rbac";
import ReportBuilder from "./pages/ReportBuilder";
import Risks from "./pages/Risks";
import SaasAdmin from "./pages/SaasAdmin";
import ScheduledScans from "./pages/ScheduledScans";
import SecurityAwareness from "./pages/SecurityAwareness";
import ServiceOverview from "./pages/ServiceOverview";
import Settings from "./pages/Settings";
import SocCenter from "./pages/SocCenter";
import TenantRegistration from "./pages/TenantRegistration";
import ThreatIntelligence from "./pages/ThreatIntelligence";
import UserManagement from "./pages/UserManagement";
import VendorRisk from "./pages/VendorRisk";
import Vulnerabilities from "./pages/Vulnerabilities";

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/tenant-registration" element={<TenantRegistration />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />

        {/* Command Center */}
        <Route path="/executive-scorecard" element={<ExecutiveScorecard />} />
        <Route path="/ai-copilot" element={<AiCopilot />} />
        <Route path="/search" element={<GlobalSearch />} />

        {/* Client Success Hub */}
        <Route path="/service-overview" element={<ServiceOverview />} />
        <Route path="/client-onboarding" element={<ClientOnboarding />} />
        <Route path="/client-packages" element={<ClientPackages />} />
        <Route path="/fix-plan" element={<FixPlan />} />

        {/* Deal Desk */}
        <Route path="/client-quotation" element={<ClientQuotation />} />
        <Route path="/report-builder" element={<ReportBuilder />} />
        <Route path="/billing" element={<Billing />} />

        {/* Attack Surface */}
        <Route path="/assets" element={<Assets />} />
        <Route path="/asset-inventory" element={<AssetInventory />} />
        <Route path="/scheduled-scans" element={<ScheduledScans />} />
        <Route path="/vulnerabilities" element={<Vulnerabilities />} />
        <Route path="/cloud-posture" element={<CloudPosture />} />
        <Route path="/attack-path" element={<AttackPath />} />

        {/* Risk & Trust */}
        <Route path="/risks" element={<Risks />} />
        <Route path="/compliance" element={<ComplianceCenter />} />
        <Route path="/policy-audit" element={<PolicyAudit />} />
        <Route path="/framework-mapping" element={<FrameworkMapping />} />
        <Route path="/vendor-risk" element={<VendorRisk />} />

        {/* Human Defense */}
        <Route path="/security-awareness" element={<SecurityAwareness />} />
        <Route path="/phishing-simulation" element={<PhishingSimulation />} />
        <Route path="/client-training" element={<ClientTraining />} />

        {/* Threat Ops */}
        <Route path="/soc" element={<SocCenter />} />
        <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
        <Route path="/dark-web" element={<DarkWebMonitoring />} />
        <Route path="/incident-playbooks" element={<IncidentPlaybook />} />
        <Route path="/ai-remediation" element={<AiRemediation />} />
        <Route path="/audit-logs" element={<AuditLogs />} />

        {/* Control Room */}
        <Route path="/saas-admin" element={<SaasAdmin />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/rbac" element={<Rbac />} />
        <Route path="/notifications" element={<NotificationsCenter />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />

        {/* Auth Callback Pages */}
        <Route path="/microsoft-auth" element={<MicrosoftAuth />} />
        <Route path="/google-auth" element={<GoogleAuth />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}