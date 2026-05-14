"use client";

import { motion } from "framer-motion";
import {
  Upload,
  Play,
  BarChart3,
  Download,
  Receipt,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, type AppView } from "@/store/appStore";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  view: AppView;
  accent: "teal" | "orange";
}

const actions: QuickAction[] = [
  {
    label: "Upload CSV",
    icon: Upload,
    view: "upload",
    accent: "teal",
  },
  {
    label: "Process Trades",
    icon: Play,
    view: "upload",
    accent: "teal",
  },
  {
    label: "View Analytics",
    icon: BarChart3,
    view: "analytics",
    accent: "orange",
  },
  {
    label: "Export Report",
    icon: Download,
    view: "export",
    accent: "orange",
  },
  {
    label: "View Tax Summary",
    icon: Receipt,
    view: "tax-summary",
    accent: "orange",
  },
  {
    label: "Add Note",
    icon: StickyNote,
    view: "notes",
    accent: "teal",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

export function QuickActions() {
  const { setCurrentView } = useAppStore();

  return (
    <motion.div
      className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin md:grid md:grid-cols-3 lg:grid-cols-6 md:overflow-visible md:pb-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            variants={itemVariants}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCurrentView(action.view)}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl border bg-card/80 backdrop-blur shadow-sm p-3 px-4",
              "min-w-[130px] shrink-0 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/5 hover:scale-[1.01] overflow-hidden",
              "text-left",
              action.accent === "teal" && "hover:border-teal-500/30",
              action.accent === "orange" && "hover:border-orange-500/30"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                action.accent === "teal" &&
                  "bg-teal-500/10 text-teal-600 dark:text-teal-400",
                action.accent === "orange" &&
                  "bg-orange-500/10 text-orange-600 dark:text-orange-400"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground truncate">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
