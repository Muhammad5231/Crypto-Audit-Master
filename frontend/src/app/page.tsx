'use client';

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { useAppStore } from "@/store/appStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { workspaceApi, authApi } from "@/lib/api";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { UploadView } from "@/components/upload/UploadView";
import { RealizedTradesView } from "@/components/trades/RealizedTradesView";
import { OpenHoldingsView } from "@/components/holdings/OpenHoldingsView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { TaxSummaryView } from "@/components/analytics/TaxSummaryView";
import { ExchangeSettingsView } from "@/components/settings/ExchangeSettingsView";
import { NotesView } from "@/components/notes/NotesView";
import { ExportView } from "@/components/export/ExportView";
import { ExportHistoryView } from "@/components/export/ExportHistoryView";
import { DocumentationView } from "@/components/documentation/DocumentationView";
import { SettingsView } from "@/components/settings/SettingsView";
import { WorkspacesView } from "@/components/workspace/WorkspacesView";
import { KeyboardShortcuts } from "@/components/common/KeyboardShortcuts";
import { PageTransition } from "@/components/common/PageTransition";
import { CommandPalette } from "@/components/common/CommandPalette";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/common/BackToTop";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);
  const currentView = useAppStore((s) => s.currentView);
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [hasVerified, setHasVerified] = useState(false);

  // Verify token on mount and when token changes (handles persist hydration)
  useEffect(() => {
    async function verifyAndLoad() {
      if (!token) {
        // If there's no token but persisted state says authenticated (corrupted state from bug fix),
        // clear auth to reset. Otherwise just stop loading for fresh users.
        if (isAuthenticated) {
          clearAuth();
        }
        setLoading(false);
        setHasVerified(true);
        return;
      }

      try {
        // Validate the existing token
        const meData = await authApi.me();
        setAuth(meData, token);

        // Load workspaces
        try {
          const wsData = await workspaceApi.list();
          const wsList = Array.isArray(wsData?.workspaces) ? wsData.workspaces : [];
          setWorkspaces(wsList);
          if (wsList.length > 0) {
            setActiveWorkspace(wsList[0]);
          }
        } catch {
          // Non-blocking: workspaces can be loaded later
        }
      } catch {
        // Token invalid — clear auth
        clearAuth();
      } finally {
        setHasVerified(true);
      }
    }
    verifyAndLoad();
  }, [token, isAuthenticated, clearAuth, setAuth, setLoading, setWorkspaces, setActiveWorkspace]);

  // Loading state — only show loading screen before initial verification completes
  // Note: persist with localStorage hydrates synchronously, so no extra hydration wait needed
  if (isLoading && !hasVerified) {
    return <LoadingScreen />;
  }

  // Auth screens
  if (!user || !isAuthenticated) {
    return (
      <AuthLayout>
        {authMode === "login" ? (
          <LoginForm onSwitchToRegister={() => setAuthMode("register")} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthMode("login")} />
        )}
      </AuthLayout>
    );
  }

  // App layout
  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />

        {/* Scrollable content area */}
        <main id="app-scroll-container" className="flex-1 overflow-y-auto px-3 py-3 lg:px-6 lg:py-4 pb-[100px] lg:pb-14">
          <AnimatePresence mode="wait">
            {currentView === "dashboard" && (
              <PageTransition key="dashboard">
                <DashboardView />
              </PageTransition>
            )}
            {currentView === "upload" && (
              <PageTransition key="upload">
                <UploadView />
              </PageTransition>
            )}
            {currentView === "realized-trades" && (
              <PageTransition key="realized-trades">
                <RealizedTradesView />
              </PageTransition>
            )}
            {currentView === "open-holdings" && (
              <PageTransition key="open-holdings">
                <OpenHoldingsView />
              </PageTransition>
            )}
            {currentView === "workspaces" && (
              <PageTransition key="workspaces">
                <WorkspacesView />
              </PageTransition>
            )}
            {currentView === "analytics" && (
              <PageTransition key="analytics">
                <AnalyticsView />
              </PageTransition>
            )}
            {currentView === "tax-summary" && (
              <PageTransition key="tax-summary">
                <TaxSummaryView />
              </PageTransition>
            )}
            {currentView === "exchange-settings" && (
              <PageTransition key="exchange-settings">
                <ExchangeSettingsView />
              </PageTransition>
            )}
            {currentView === "notes" && (
              <PageTransition key="notes">
                <NotesView />
              </PageTransition>
            )}
            {currentView === "export" && (
              <PageTransition key="export">
                <ExportView />
              </PageTransition>
            )}
            {currentView === "export-history" && (
              <PageTransition key="export-history">
                <ExportHistoryView />
              </PageTransition>
            )}
            {currentView === "documentation" && (
              <PageTransition key="documentation">
                <DocumentationView />
              </PageTransition>
            )}
            {currentView === "settings" && (
              <PageTransition key="settings">
                <SettingsView />
              </PageTransition>
            )}
          </AnimatePresence>
        </main>

        {/* Footer — stays at bottom, never scrolls */}
        <Footer />
      </div>

      {/* Back to Top Button */}
      <BackToTop />

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcuts />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
