import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilesListPage } from "./pages/profiles/ProfilesListPage";
import { ProfileEditPage } from "./pages/profiles/ProfileEditPage";
import { ShotPlanListPage } from "./pages/plans/ShotPlanListPage";
import { ShotPlanWizardPage } from "./pages/plans/ShotPlanWizardPage";
import { ShotPlanDetailPage } from "./pages/plans/ShotPlanDetailPage";
import { SharedCardsManagerPage } from "./pages/share/SharedCardsManagerPage";
import { SharedCardPublicPage } from "./pages/share/SharedCardPublicPage";
import { AccountPage } from "./pages/AccountPage";
import { FaqPage, PrivacyPage, TermsPage } from "./pages/FaqPage";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/s/:publicId" element={<SharedCardPublicPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/app" element={<DashboardPage />} />
        <Route path="/app/profiles" element={<ProfilesListPage />} />
        <Route path="/app/profiles/new/:kind" element={<ProfileEditPage />} />
        <Route path="/app/profiles/:id" element={<ProfileEditPage />} />
        <Route path="/app/plans" element={<ShotPlanListPage />} />
        <Route path="/app/plans/new" element={<ShotPlanWizardPage />} />
        <Route path="/app/plans/:id" element={<ShotPlanDetailPage />} />
        <Route path="/app/cards" element={<SharedCardsManagerPage />} />
        <Route path="/app/account" element={<AccountPage />} />
        <Route path="/app/faq" element={<FaqPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
