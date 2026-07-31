/** Global error handler for frontend JavaScript errors */
export function initGlobalErrorHandler() {
  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);
    // In production, send to error monitoring service
    if (window.location.hostname !== "localhost") {
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
    if (window.location.hostname !== "localhost") {
      console.error("Production promise rejection:", {
        reason: event.reason,
      });
    }
  });
}
