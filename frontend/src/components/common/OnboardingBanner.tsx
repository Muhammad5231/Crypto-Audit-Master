"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, FolderPlus, Upload, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "crypto-audit-onboarding-dismissed";

interface Step {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    label: "Create Workspace",
    description: "Set up a workspace for your tax year",
    icon: FolderPlus,
  },
  {
    label: "Upload CSV",
    description: "Import your exchange trade data",
    icon: Upload,
  },
  {
    label: "Process Trades",
    description: "Run FIFO matching & calculate tax",
    icon: Zap,
  },
];

export function OnboardingBanner() {
  const { workspaces: ws, activeWorkspace } = useWorkspaceStore();
  const workspaces = ws ?? [];
  const { setCurrentView, onCreateWorkspace } = useAppStore();
  const [visible, setVisible] = useState(false);

  // Check localStorage for dismissed state — initialize lazily
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Delay showing for animation
  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  // Determine current step based on user progress
  const getStepStatus = (stepIndex: number): "completed" | "active" | "upcoming" => {
    if (stepIndex === 0) {
      if (workspaces.length > 0) return "completed";
      return "active";
    }
    if (stepIndex === 1) {
      if (activeWorkspace && (activeWorkspace._count?.csvFiles ?? 0) > 0) return "completed";
      if (workspaces.length > 0) return "active";
      return "upcoming";
    }
    if (stepIndex === 2) {
      if (activeWorkspace && (activeWorkspace._count?.reports ?? 0) > 0) return "completed";
      if (activeWorkspace && (activeWorkspace._count?.csvFiles ?? 0) > 0) return "active";
      return "upcoming";
    }
    return "upcoming";
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore
      }
    }, 300);
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === 0 && workspaces.length === 0) {
      onCreateWorkspace();
    } else if (stepIndex === 1) {
      setCurrentView("upload");
    } else if (stepIndex === 2) {
      setCurrentView("upload");
    }
  };

  if (dismissed) return null;

  // Only show when user has no workspaces OR active workspace has no files
  const hasWorkspaces = workspaces.length > 0;
  const hasFiles = activeWorkspace && (activeWorkspace._count?.csvFiles ?? 0) > 0;
  const shouldShow = !hasWorkspaces || !hasFiles;

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      )}
    >
      {/* Left gradient border - thicker with shimmer effect */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 via-emerald-400 to-orange-500" />
      {/* Animated shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
      />

      <div className="bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5 p-4 sm:p-5">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          aria-label="Dismiss onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-4">
          {/* Title */}
          <div className="pr-8">
            <h3 className="text-sm font-semibold text-foreground">
              Get Started with Crypto Tax Audit
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Follow these steps to analyze your crypto trades and calculate
              taxes.
            </p>
          </div>

          {/* Step Indicators with connected dots */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
            {STEPS.map((step, idx) => {
              const status = getStepStatus(idx);
              const Icon = step.icon;
              const isClickable = status === "active";

              return (
                <div key={idx} className="flex items-center gap-3 flex-1 relative">
                  {/* Connector line (between steps on desktop) */}
                  {idx < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-5 left-[calc(50%+20px)] right-[-20px]">
                      <div
                        className={cn(
                          "h-px w-full",
                          status === "completed"
                            ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                            : "bg-border/50"
                        )}
                      />
                    </div>
                  )}
                  {/* Vertical connector on mobile */}
                  {idx < STEPS.length - 1 && (
                    <div className="sm:hidden absolute top-[calc(100%+4px)] left-5">
                      <div
                        className={cn(
                          "w-px h-4",
                          status === "completed"
                            ? "bg-gradient-to-b from-emerald-400 to-teal-400"
                            : "bg-border/50"
                        )}
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    {/* Step circle */}
                    <button
                      onClick={() => handleStepClick(idx)}
                      disabled={!isClickable}
                      className={cn(
                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer z-10",
                        status === "completed" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        status === "active" &&
                          "bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-2 ring-teal-500/30 shadow-sm shadow-teal-500/10",
                        status === "upcoming" &&
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {status === "completed" ? (
                        <Check className="h-4.5 w-4.5" />
                      ) : (
                        <Icon className="h-4.5 w-4.5" />
                      )}
                      {/* Pulsing ring for active step */}
                      {status === "active" && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-2 border-teal-500/20"
                          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}
                    </button>

                    {/* Step text */}
                    <div className="flex-1 min-w-0 sm:hidden">
                      <p
                        className={cn(
                          "text-xs font-semibold flex items-center gap-1.5",
                          status === "completed" && "text-emerald-700 dark:text-emerald-400",
                          status === "active" && "text-foreground",
                          status === "upcoming" && "text-muted-foreground"
                        )}
                      >
                        <span>{idx + 1}.</span> {step.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <p
                        className={cn(
                          "text-xs font-semibold flex items-center gap-1.5",
                          status === "completed" && "text-emerald-700 dark:text-emerald-400",
                          status === "active" && "text-foreground",
                          status === "upcoming" && "text-muted-foreground"
                        )}
                      >
                        <span>{idx + 1}.</span> {step.label}
                        {status === "active" && (
                          <motion.span
                            className="flex h-1.5 w-1.5"
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
                          </motion.span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick action */}
          {getStepStatus(0) === "active" && (
            <div>
              <Button
                onClick={onCreateWorkspace}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs"
              >
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                Create Your First Workspace
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
