'use client';

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { workspaceApi } from "@/lib/api";
import { toast } from "sonner";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!emailOrUsername.trim()) {
      toast.error("Please enter your email or username");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authApi.login({ emailOrUsername, password });
      setAuth(data.user, data.token);
      toast.success("Welcome back!", {
        description: `Signed in as ${data.user.username}`,
      });

      // Load workspaces after login
      try {
        const wsData = await workspaceApi.list();
        setWorkspaces(wsData.workspaces);
        if (wsData.workspaces.length > 0) {
          setActiveWorkspace(wsData.workspaces[0]);
        }
      } catch {
        // Non-blocking: workspaces will load later
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-none lg:shadow-sm lg:border lg:rounded-2xl bg-background">
      <CardHeader className="space-y-1.5 px-0 lg:px-6 pt-0 lg:pt-6">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Sign In
        </CardTitle>
        <CardDescription>
          Enter your credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 lg:px-6 pb-0 lg:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email/Username */}
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername" className="text-sm font-medium">
              Email or Username
            </Label>
            <Input
              id="emailOrUsername"
              type="text"
              placeholder="you@example.com"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              autoComplete="username"
              className="h-11 rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11 rounded-xl pr-10 bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-lg shadow-teal-600/20 transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Switch to Register */}
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            Don&apos;t have an account?{" "}
          </span>
          <button
            onClick={onSwitchToRegister}
            className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
          >
            Create Account
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
