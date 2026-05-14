import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import App from "./app/page";
import "./app/globals.css";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <App />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);