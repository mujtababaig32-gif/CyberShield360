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
import CloudPosture from "./pages/CloudPosture";
import ComplianceCenter from "./pages/ComplianceCenter";
import DarkWebMonitoring from "./pages/DarkWebMonitoring";
import Dashboard from "./pages/Dashboard";
import ExecutiveScorecard from "./pages/ExecutiveScorecard";
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
import Risks from "./pages/Risks";
import SaasAdmin from "./pages/SaasAdmin";
import ScheduledScans from "./pages/ScheduledScans";
import SecurityAwareness from "./pages/SecurityAwareness";
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/executive-scorecard" element={<ExecutiveScorecard />} />
        <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
        <Route path="/ai-copilot" element={<AiCopilot />} />
        <Route path="/dark-web" element={<DarkWebMonitoring />} />
        <Route path="/security-awareness" element={<SecurityAwareness />} />
        <Route path="/phishing-simulation" element={<PhishingSimulation />} />
        <Route path="/policy-audit" element={<PolicyAudit />} />
        <Route path="/framework-mapping" element={<FrameworkMapping />} />
        <Route path="/cloud-posture" element={<CloudPosture />} />
        <Route path="/attack-path" element={<AttackPath />} />
        <Route path="/incident-playbooks" element={<IncidentPlaybook />} />
        <Route path="/soc" element={<SocCenter />} />
        <Route path="/asset-inventory" element={<AssetInventory />} />
        <Route path="/vendor-risk" element={<VendorRisk />} />
        <Route path="/compliance" element={<ComplianceCenter />} />
        <Route path="/ai-remediation" element={<AiRemediation />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/scheduled-scans" element={<ScheduledScans />} />
        <Route path="/vulnerabilities" element={<Vulnerabilities />} />
        <Route path="/risks" element={<Risks />} />
        <Route path="/notifications" element={<NotificationsCenter />} />
        <Route path="/saas-admin" element={<SaasAdmin />} />
        <Route path="/microsoft-auth" element={<MicrosoftAuth />} />
        <Route path="/google-auth" element={<GoogleAuth />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/rbac" element={<Rbac />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/search" element={<GlobalSearch />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
