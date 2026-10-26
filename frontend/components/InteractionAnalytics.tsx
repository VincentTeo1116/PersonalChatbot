"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { classifyLink } from "@/lib/analytics-events";
import { reportGaEvent, trackPortfolioEvent } from "@/lib/analytics";

const reportVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (!["LCP", "INP", "CLS", "TTFB"].includes(metric.name)) return;
  reportGaEvent("web_vital", {
    metric_name: metric.name,
    metric_value: Math.round(metric.value * 1000) / 1000,
    metric_rating: metric.rating,
    metric_id: metric.id,
  });
};

export default function InteractionAnalytics() {
  const pathname = usePathname();
  useReportWebVitals(reportVital);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.defaultPrevented) return;
      const resume = event.target.closest('[data-analytics-event="resume_open"]');
      if (resume) { trackPortfolioEvent("resume_open"); return; }
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;
      const name = classifyLink(anchor.getAttribute("href") || "", window.location.href);
      if (name) trackPortfolioEvent(name);
    };
    const meeting = () => trackPortfolioEvent("meeting_request_open");
    const resume = () => trackPortfolioEvent("resume_open");
    document.addEventListener("click", click);
    window.addEventListener("portfolio:open-meeting-request", meeting);
    window.addEventListener("portfolio:open-resume", resume);
    return () => {
      document.removeEventListener("click", click);
      window.removeEventListener("portfolio:open-meeting-request", meeting);
      window.removeEventListener("portfolio:open-resume", resume);
    };
  }, [pathname]);
  return null;
}
