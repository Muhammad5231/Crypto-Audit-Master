'use client';

import { useEffect, useState } from "react";
import { Shield, Bitcoin, BarChart3, FileCheck, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const features = [
  { label: "FIFO Matching Engine", icon: ArrowRightLeft },
  { label: "India VDA Tax Compliant", icon: FileCheck },
  { label: "Multi-Exchange Support", icon: BarChart3 },
  { label: "ITR-Ready Reports", icon: FileCheck },
];

const floatingShapes = [
  { size: 48, x: "10%", y: "15%", delay: 0, duration: 6, type: "circle" },
  { size: 32, x: "75%", y: "25%", delay: 1.5, duration: 7, type: "diamond" },
  { size: 40, x: "20%", y: "70%", delay: 0.8, duration: 5.5, type: "circle" },
  { size: 28, x: "80%", y: "65%", delay: 2, duration: 8, type: "diamond" },
  { size: 20, x: "50%", y: "85%", delay: 3, duration: 6.5, type: "circle" },
  { size: 36, x: "60%", y: "45%", delay: 1, duration: 7.5, type: "circle" },
  { size: 24, x: "35%", y: "40%", delay: 2.5, duration: 5, type: "diamond" },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  const { resolvedTheme } = useTheme();
  const [activeFeature, setActiveFeature] = useState(0);

  // Cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden auth-gradient-panel">
        {/* Floating animated shapes */}
        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-white/10 bg-white/[0.03]"
            style={{
              width: shape.size,
              height: shape.size,
              left: shape.x,
              top: shape.y,
              borderRadius: shape.type === "diamond" ? "8px" : "50%",
            }}
            animate={{
              y: [0, -12, 4, -8, 0],
              rotate: shape.type === "diamond" ? [0, 90, 180, 270, 360] : [0, 5, -3, 2, 0],
              opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
            }}
            transition={{
              duration: shape.duration,
              delay: shape.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Floating crypto icons */}
        <motion.div
          className="absolute top-[18%] right-[15%] text-white/[0.07]"
          animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bitcoin className="h-16 w-16" />
        </motion.div>
        <motion.div
          className="absolute bottom-[25%] left-[12%] text-white/[0.06]"
          animate={{ y: [0, 8, -6, 0], rotate: [0, -3, 4, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <BarChart3 className="h-14 w-14" />
        </motion.div>
        <motion.div
          className="absolute top-[55%] right-[25%] text-white/[0.05]"
          animate={{ y: [0, -8, 4, 0], rotate: [0, 8, -4, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <FileCheck className="h-12 w-12" />
        </motion.div>

        {/* Animated grid/particle overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glowing orbs */}
        <motion.div
          className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/[0.06] blur-3xl"
          animate={{ opacity: [0.06, 0.12, 0.06], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-teal-400/[0.08] blur-3xl"
          animate={{ opacity: [0.08, 0.15, 0.08], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-orange-400/[0.05] blur-3xl"
          animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.12, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          {/* Top section */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Crypto Audit Master
            </span>
          </div>

          {/* Center content */}
          <div className="max-w-md">
            <motion.h1
              className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              Master Your{" "}
              <span className="text-orange-400">Crypto Taxes</span> with
              Confidence
            </motion.h1>
            <motion.p
              className="text-lg text-teal-100/80 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              Automate your spot trade audit, calculate capital gains using FIFO
              method, and generate tax-ready reports — all optimized for Indian
              tax regulations.
            </motion.p>

            {/* Animated feature showcase */}
            <motion.div
              className="mt-8 h-10 flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  className="flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-2.5"
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                >
                  {(() => {
                    const FeatureIcon = features[activeFeature].icon;
                    return <FeatureIcon className="h-4 w-4 text-orange-400 shrink-0" />;
                  })()}
                  <span className="text-sm font-medium text-white whitespace-nowrap">
                    {features[activeFeature].label}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Feature dot indicators */}
            <div className="flex gap-2 mt-4">
              {features.map((_, i) => (
                <motion.div
                  key={i}
                  className="h-1.5 rounded-full bg-white/30"
                  animate={{
                    width: i === activeFeature ? 24 : 8,
                    backgroundColor: i === activeFeature ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.2)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="text-sm text-teal-200/60">
            © {new Date().getFullYear()} Crypto Audit Master. Secure & Private.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center justify-center gap-2.5 pt-8 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <Shield className="h-5.5 w-5.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">
              Crypto Audit Master
            </span>
            <span className="text-xs text-muted-foreground">
              Indian Crypto Spot Trade Audit & Tax Analysis
            </span>
          </div>
        </div>

        {/* Form container */}
        <div
          className={`flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 ${
            resolvedTheme === "dark" ? "bg-background" : "bg-gray-50/50"
          }`}
        >
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Form card with backdrop blur */}
            <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-lg shadow-black/[0.03] dark:shadow-black/[0.2]">
              {/* Desktop tagline */}
              <div className="hidden lg:block mb-8">
                <p className="text-sm text-muted-foreground">
                  Indian Crypto Spot Trade Audit & Tax Analysis
                </p>
              </div>

              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
