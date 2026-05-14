'use client';

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { workspaceApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const presetColors = [
  { name: "Teal", value: "#0d9488" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Green", value: "#22c55e" },
  { name: "Pink", value: "#ec4899" },
  { name: "Yellow", value: "#eab308" },
];

const presetIcons = [
  { name: "Briefcase", value: "briefcase" },
  { name: "User", value: "user" },
  { name: "Building", value: "building" },
  { name: "Chart", value: "chart" },
  { name: "Wallet", value: "wallet" },
  { name: "Coin", value: "bitcoin" },
  { name: "Rocket", value: "rocket" },
  { name: "Star", value: "star" },
];

const iconMap: Record<string, string> = {
  briefcase: "💼",
  user: "👤",
  building: "🏢",
  chart: "📊",
  wallet: "👛",
  bitcoin: "₿",
  rocket: "🚀",
  star: "⭐",
};

const financialYears = [
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
];

export function CreateWorkspaceModal() {
  const showCreateWorkspace = useAppStore((s) => s.showCreateWorkspace);
  const setShowCreateWorkspace = useAppStore((s) => s.setShowCreateWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#0d9488");
  const [icon, setIcon] = useState("briefcase");
  const [financialYear, setFinancialYear] = useState("2024-2025");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showCreateWorkspace) {
      // Reset form when opening
      setName("");
      setDescription("");
      setColor("#0d9488");
      setIcon("briefcase");
      setFinancialYear("2024-2025");
    }
  }, [showCreateWorkspace]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setIsLoading(true);
    try {
      const data = await workspaceApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        financialYear,
      });
      addWorkspace(data.workspace);
      setActiveWorkspace(data.workspace);
      toast.success("Workspace created!", {
        description: `"${data.workspace.name}" is ready to use.`,
      });
      setShowCreateWorkspace(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={showCreateWorkspace}
      onOpenChange={setShowCreateWorkspace}
    >
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-6 gap-5">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Workspace</DialogTitle>
          <DialogDescription>
            Set up a workspace to organize your crypto audit data for a specific
            financial year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="ws-name" className="text-sm font-medium">
              Workspace Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ws-name"
              placeholder="e.g., My Crypto Portfolio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ws-desc" className="text-sm font-medium">
              Description
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </Label>
            <Textarea
              id="ws-desc"
              placeholder="Brief description of this workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px] rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-8 w-8 rounded-xl transition-all duration-200 flex items-center justify-center",
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-110"
                  )}
                  style={{
                    backgroundColor: c.value,
                    ...(color === c.value
                      ? { ringColor: c.value }
                      : {}),
                  }}
                  title={c.name}
                >
                  {color === c.value && (
                    <svg
                      className="h-4 w-4 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {presetIcons.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIcon(i.value)}
                  className={cn(
                    "h-10 w-10 rounded-xl text-lg flex items-center justify-center transition-all duration-200 border",
                    icon === i.value
                      ? "border-teal-500 bg-teal-500/10 scale-110"
                      : "border-border/50 bg-muted/30 hover:bg-muted/50 hover:scale-110"
                  )}
                  title={i.name}
                >
                  {iconMap[i.value]}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Year */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Financial Year</Label>
            <Select
              value={financialYear}
              onValueChange={setFinancialYear}
              disabled={isLoading}
            >
              <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50">
                <SelectValue placeholder="Select financial year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {financialYears.map((fy) => (
                  <SelectItem key={fy} value={fy} className="rounded-lg">
                    FY {fy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setShowCreateWorkspace(false)}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !name.trim()}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
