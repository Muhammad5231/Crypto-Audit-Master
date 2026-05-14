"use client";

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  index?: number;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  className,
  index = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: index * 0.05,
      }}
      whileHover={{
        scale: 1.01,
        y: -2,
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative rounded-2xl bg-card/80 backdrop-blur border shadow-sm p-2 transition-all duration-200",
        "hover:shadow-lg hover:shadow-teal-500/5 hover:border-border/80 hover:scale-[1.01]",
        "cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
          </div>
          <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent tracking-tight truncate">
            {value}
          </div>
          {trend && trendValue && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                trend === "down" && "bg-red-500/10 text-red-600 dark:text-red-400",
                trend === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            trend === "up" && "bg-emerald-500/10",
            trend === "down" && "bg-red-500/10",
            (!trend || trend === "neutral") && "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              trend === "up" && "text-emerald-600 dark:text-emerald-400",
              trend === "down" && "text-red-600 dark:text-red-400",
              (!trend || trend === "neutral") && "text-muted-foreground"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}
