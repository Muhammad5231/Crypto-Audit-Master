"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcutsStore } from "@/store/keyboardShortcutsStore";

interface ShortcutDef {
  keys: string[];
  label: string;
  view: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { keys: ["G", "D"], label: "Go to Dashboard", view: "dashboard" },
  { keys: ["G", "U"], label: "Go to Upload", view: "upload" },
  { keys: ["G", "T"], label: "Go to Trades", view: "realized-trades" },
  { keys: ["G", "A"], label: "Go to Analytics", view: "analytics" },
  { keys: ["G", "S"], label: "Go to Settings", view: "settings" },
  { keys: ["G", "N"], label: "Go to Notes", view: "notes" },
  { keys: ["?"], label: "Show shortcuts", view: "" },
];

export function KeyboardShortcuts() {
  const { isOpen, close, toggle } = useKeyboardShortcutsStore();
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeyRef = useRef<string | null>(null);

  const navigateTo = useCallback((view: string) => {
    import("@/store/appStore").then(({ useAppStore }) => {
      useAppStore.getState().setCurrentView(view as never);
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Ctrl+/ or ? shortcut to toggle dialog
      if (e.key === "?" || (e.ctrlKey && key === "/")) {
        e.preventDefault();
        toggle();
        return;
      }

      // Escape closes dialog - handled by Dialog component

      // G-prefixed shortcuts
      if (key === "G" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        pendingKeyRef.current = "G";

        if (actionTimeoutRef.current) {
          clearTimeout(actionTimeoutRef.current);
        }

        actionTimeoutRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
        }, 600);
        return;
      }

      // Second key for G-prefixed shortcuts
      if (pendingKeyRef.current === "G") {
        e.preventDefault();
        const secondKey = key;
        pendingKeyRef.current = null;

        if (actionTimeoutRef.current) {
          clearTimeout(actionTimeoutRef.current);
        }

        const shortcut = SHORTCUTS.find(
          (s) => s.keys.length === 2 && s.keys[0] === "G" && s.keys[1] === secondKey
        );
        if (shortcut && shortcut.view) {
          navigateTo(shortcut.view);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, [toggle, navigateTo]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-teal-600"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.001" />
              <path d="M10 8h.001" />
              <path d="M14 8h.001" />
              <path d="M18 8h.001" />
              <path d="M8 12h.001" />
              <path d="M12 12h.001" />
              <path d="M16 12h.001" />
              <path d="M7 16h10" />
            </svg>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.label}
              className="flex items-center gap-2 rounded-xl border p-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => {
                if (shortcut.view) {
                  navigateTo(shortcut.view);
                }
                close();
              }}
            >
              <div className="flex items-center gap-0.5 shrink-0">
                {shortcut.keys.map((k, idx) => (
                  <span key={idx}>
                    <kbd className="inline-flex h-6 min-w-[22px] items-center justify-center rounded-md border bg-muted px-1.5 text-[11px] font-mono font-medium text-foreground shadow-sm">
                      {k}
                    </kbd>
                    {idx < shortcut.keys.length - 1 && (
                      <span className="mx-0.5 text-[9px] text-muted-foreground">
                        then
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {shortcut.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="inline-flex h-5 items-center justify-center rounded border bg-muted px-1 text-[10px] font-mono mx-0.5">Esc</kbd> to close
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={close}
            className="rounded-xl text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
