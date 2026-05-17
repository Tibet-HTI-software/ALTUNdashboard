import { toast } from "sonner";

/**
 * Shared demo-action helper for the prototype dashboard.
 *
 * The internal dashboard is wired to mock data only. Every visible button
 * that does not navigate or mutate local UI state calls `demoAction` so the
 * user gets a clear "this would do X" toast instead of a silent no-op.
 *
 * Replace each call site with a real handler when the corresponding backend
 * endpoint, mutation, or workflow is connected.
 */
export function demoAction(message: string) {
  toast("Demo action", {
    description: message,
  });
}

/** Success-flavoured demo toast — used after mock mutations resolve. */
export function demoSuccess(title: string, message?: string) {
  toast.success(title, { description: message });
}

/** Error-flavoured demo toast. */
export function demoError(title: string, message?: string) {
  toast.error(title, { description: message });
}
