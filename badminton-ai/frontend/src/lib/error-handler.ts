/** Global error handler for frontend JavaScript errors */
export function initGlobalErrorHandler(): void {
  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);
    // In production, send to error monitoring service
    if (import.meta.env.PROD) {
      // Send to error tracking service (e.g., Sentry)
      console.error("Production error:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    if (import.meta.env.PROD) {
      console.error("Production promise rejection:", {
        reason: event.reason,
      });
    }
  });
}
