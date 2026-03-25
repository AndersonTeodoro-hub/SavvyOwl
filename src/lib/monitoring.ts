import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initMonitoring() {
  if (!SENTRY_DSN) {
    console.log("[Monitoring] No SENTRY_DSN configured — running without error tracking");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || "production",
    release: `savvyowl@${import.meta.env.VITE_APP_VERSION || "0.1.0"}`,

    // Performance
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0, // Don't record sessions by default
    replaysOnErrorSampleRate: 1.0, // Record 100% of sessions with errors

    // Filter noise
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection",
      "AbortError",
      "Network request failed",
      "Load failed",
      "ChunkLoadError",
    ],

    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) return null;
      return event;
    },
  });

  console.log("[Monitoring] Sentry initialized");
}

// Helper to capture errors with context
export function captureError(error: Error, context?: Record<string, any>) {
  console.error("[SavvyOwl Error]", error, context);

  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

// Helper to set user context
export function setMonitoringUser(userId: string, email?: string, plan?: string) {
  if (!SENTRY_DSN) return;

  Sentry.setUser({
    id: userId,
    email,
    plan,
  } as any);
}

// Helper to clear user on logout
export function clearMonitoringUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

export { Sentry };
