'use client';

import { BookOpen, Settings, Heart } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export function Footer() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  return (
    <footer className="hidden lg:block shrink-0 select-none border-t border-border/30 bg-card/80 backdrop-blur-xl">
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

      <div className="flex items-center px-6 h-10">
        {/* Left: Version */}
        <div className="text-xs text-muted-foreground font-medium">
          <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent font-semibold">
            Crypto Audit Master
          </span>
          <span className="ml-1.5 text-muted-foreground/60">v1.5</span>
        </div>

        {/* Center: Links */}
        <div className="flex-1 flex items-center justify-center gap-5">
          <button
            onClick={() => setCurrentView("documentation")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200 group"
          >
            <BookOpen className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            <span className="group-hover:underline underline-offset-2">Documentation</span>
          </button>
          <span className="text-border/30">·</span>
          <button
            onClick={() => setCurrentView("settings")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200 group"
          >
            <Settings className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="group-hover:underline underline-offset-2">Settings</span>
          </button>
        </div>

        {/* Right: Tagline */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Heart className="h-3 w-3 text-orange-500/60" />
          <span>Made for Indian Crypto Traders</span>
        </div>
      </div>
    </footer>
  );
}
