const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

// Loads posthog-js as a separate async chunk (kept out of the critical bundle)
// and initializes it on the next idle frame. The automatic pageview fires at
// init time, so deferring here still captures the initial pageview — just a
// few hundred ms after load rather than during the critical path.
//
// The app routes with the URL hash (HashRouter uses history.pushState), so
// `history_change` also records a pageview for every deck and slide visited.
export function initAnalytics() {
  if (!posthogKey) return;

  const start = () =>
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(posthogKey, {
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        defaults: "2025-05-24",
        capture_pageview: "history_change",
      });
    });

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => void start(), { timeout: 2000 });
  } else {
    window.setTimeout(() => void start(), 1);
  }
}
