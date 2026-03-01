import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

type ActivityPayload = {
  activityType: "page_view" | "button_click";
  path: string;
  buttonId?: string;
  buttonLabel?: string;
  metadata?: Record<string, unknown>;
};

export function ActivityTracker() {
  const [location] = useLocation();
  const lastTrackedPathRef = useRef<string>("");

  useEffect(() => {
    const fullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (lastTrackedPathRef.current === fullPath) {
      return;
    }

    lastTrackedPathRef.current = fullPath;
    sendActivity({
      activityType: "page_view",
      path: fullPath,
    });
  }, [location]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest<HTMLElement>('button, [role="button"], a[data-testid^="button-"]');
      if (!interactive) return;

      const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const buttonId =
        interactive.dataset.testid ||
        interactive.id ||
        interactive.getAttribute("aria-label") ||
        undefined;
      const buttonLabel = getButtonLabel(interactive);

      sendActivity({
        activityType: "button_click",
        path,
        buttonId,
        buttonLabel,
        metadata: interactive.tagName === "A" ? { href: interactive.getAttribute("href") } : undefined,
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}

function getButtonLabel(element: HTMLElement): string | undefined {
  const text = element.innerText?.trim() || element.textContent?.trim();
  if (text) {
    return text.slice(0, 255);
  }
  return element.getAttribute("aria-label") || undefined;
}

function sendActivity(payload: ActivityPayload) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/activity", blob);
    return;
  }

  void fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    credentials: "include",
    keepalive: true,
  });
}
