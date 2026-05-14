import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = {
  hasError: boolean;
  message?: string;
};

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Unknown frontend error",
    };
  }

  componentDidCatch(error: Error) {
    console.error("Frontend crashed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl border bg-card p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Frontend Error</h1>
              <p className="text-sm text-muted-foreground">
                Black screen ki jagah ab error visible hoga.
              </p>
            </div>
          </div>

          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-muted p-3 text-xs">
            {this.state.message}
          </pre>

          <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload App
          </Button>
        </div>
      </div>
    );
  }
}