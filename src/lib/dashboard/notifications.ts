/**
 * Browser Notification utilities.
 *
 * Thin, permission-safe wrappers around the HTML5 Notifications API.
 * All functions are silent no-ops in SSR / environments where
 * `window.Notification` is unavailable.
 *
 * Usage flow:
 *   1. Call `requestNotificationPermission()` once (e.g. when the WS
 *      channel first goes live) to prompt the user.
 *   2. Call `showBrowserNotification(title, body)` whenever a critical
 *      event is detected — only fires if permission has been granted.
 */

/** Request browser notification permission if not yet asked.
 *  Returns the resulting permission state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission !== "default") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Show a browser notification.
 * Silent no-op if permission is not "granted" or the API is unavailable.
 *
 * `tag` deduplicates: a second notification with the same tag replaces
 * the previous one rather than stacking (prevents alert floods).
 */
export function showBrowserNotification(
  title: string,
  body: string,
  tag?: string,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: tag ?? title,   // deduplicate by title by default
      requireInteraction: false,
    });
  } catch {
    /* Some environments throw even with permission — swallow silently. */
  }
}
