'use client';

import { useState, useMemo } from "react";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { workspaceApi } from "@/lib/api";
import { toast } from "sonner";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  checks: { label: string; met: boolean }[];
} {
  const checks = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500", checks };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500", checks };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500", checks };
  if (score <= 4)
    return { score, label: "Strong", color: "bg-teal-500", checks };
  return { score, label: "Very Strong", color: "bg-green-500", checks };
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  function validate(): boolean {
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const data = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setAuth(data.user, data.token);
      toast.success("Account created!", {
        description: `Welcome, ${data.user.username}!`,
      });

      // Load workspaces after registration
      try {
        const wsData = await workspaceApi.list();
        setWorkspaces(wsData.workspaces);
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-none lg:shadow-sm lg:border lg:rounded-2xl bg-background">
      <CardHeader className="space-y-1.5 px-0 lg:px-6 pt-0 lg:pt-6">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create Account
        </CardTitle>
        <CardDescription>
          Get started with your crypto audit journey
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 lg:px-6 pb-0 lg:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="crypto_trader"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="h-11 rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-11 rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength.score <= 1
                        ? "text-red-500"
                        : passwordStrength.score <= 2
                        ? "text-orange-500"
                        : passwordStrength.score <= 3
                        ? "text-yellow-600"
                        : "text-teal-600"
                    }`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>

                {/* Strength checks */}
                <div className="grid grid-cols-1 gap-1">
                  {passwordStrength.checks.map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {check.met ? (
                        <Check className="h-3 w-3 text-teal-500" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground/50" />
                      )}
                      <span
                        className={
                          check.met
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50"
                        }
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`h-11 rounded-xl pr-10 bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20 ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                    : confirmPassword && confirmPassword === password
                    ? "border-teal-500/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
                    : ""
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword && confirmPassword === password && (
              <p className="text-xs text-teal-600">Passwords match</p>
            )}
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
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
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <button
            onClick={onSwitchToLogin}
            className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
          >
            Sign In
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
