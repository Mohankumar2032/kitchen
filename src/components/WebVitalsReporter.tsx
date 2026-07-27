"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reports Core Web Vitals to the console in development and to /api/vitals in production.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const body = {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType,
      delta: metric.delta,
    };

    if (process.env.NODE_ENV === "development") {
      console.info("[web-vital]", body);
      return;
    }

    const payload = JSON.stringify(body);
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/vitals", payload);
      return;
    }

    void fetch("/api/vitals", {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
      keepalive: true,
    });
  });

  return null;
}
