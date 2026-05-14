'use client';

import { useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  const getScrollContainer = useCallback(() => {
    if (typeof document === "undefined") return null;
    return document.getElementById("app-scroll-container");
  }, []);

  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    function handleScroll() {
      setVisible(container.scrollTop > 300);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [getScrollContainer]);

  function scrollToTop() {
    const container = getScrollContainer();
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`
        fixed bottom-20 right-6 z-40
        h-10 w-10 rounded-full
        bg-teal-600 text-white shadow-lg shadow-teal-600/25
        hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/30
        transition-all duration-300 ease-in-out
        lg:block
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
}
