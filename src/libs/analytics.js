// PostHog product analytics — browser-only wrapper.
// Shared org "dawn studio", single "Default project" (ID 657661). Every
// event carries the super property app=openq so per-app dashboards can
// filter the shared project. Public client key — safe to embed in the bundle.
// Session replay is OFF, autocapture is OFF: we capture pageview/pageleave
// automatically plus a curated list of key actions, nothing else.
// NO PII in any event or property: anonymous only, never call identify().
//
// NOTE: posthog-js is loaded via dynamic import() INSIDE initAnalytics, not
// via a top-level static import. A static import puts posthog-js into the
// pages-router server bundle, which breaks gun/sea's side-effect during SSR
// prerender (gun.user() becomes "not a function" and static generation of
// /, /404, /settings fails). Lazy-loading keeps the server bundle clean —
// initAnalytics only ever runs in the browser (useEffect in _app).

// Env vars first (set in Vercel / .env.local), hardcoded public key/host as
// the fallback — the PostHog public client key is not a secret.
const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  "phc_Dn2EebGR8eVrLKfQwArtfwxE4cUKQq2NPhwMRph4LqUf";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

const FIRST_OPEN_KEY = "openq-posthog-first-open";

const isBrowser = () => typeof window !== "undefined";

let initialized = false;
let posthogInstance = null;
const pending = [];

const flushPending = () => {
  if (!posthogInstance) return;
  while (pending.length) {
    const [event, props] = pending.shift();
    try {
      posthogInstance.capture(event, props);
    } catch {
      /* analytics must never break the app */
    }
  }
};

const fireFirstOpen = () => {
  // First visit of this browser — once per user, via localStorage.
  try {
    if (!window.localStorage.getItem(FIRST_OPEN_KEY)) {
      window.localStorage.setItem(FIRST_OPEN_KEY, "1");
      const params = new URLSearchParams(window.location.search);
      track("app_first_open", {
        referrer: document.referrer || null,
        utm_source: params.get("utm_source") || null,
        locale: window.navigator.language || null,
      });
    }
  } catch {
    /* private mode — pageview still counts */
  }
};

export const initAnalytics = () => {
  if (initialized || !isBrowser() || !POSTHOG_KEY) return;
  initialized = true; // set synchronously — guards double-init races
  import("posthog-js")
    .then((mod) => {
      const posthog = mod.default || mod;
      try {
        posthog.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          autocapture: false,
          capture_pageview: true,
          capture_pageleave: true,
          disable_session_recording: true,
        });
        // CRITICAL: super property tags every event with this app in the
        // shared project.
        posthog.register({ app: "openq" });
        posthogInstance = posthog;
        flushPending();
        fireFirstOpen();
      } catch {
        /* analytics must never break the app */
      }
    })
    .catch(() => {
      /* analytics must never break the app */
    });
};

export const track = (event, props = {}) => {
  if (!isBrowser() || !event) return;
  if (!initialized) initAnalytics();
  if (posthogInstance) {
    try {
      posthogInstance.capture(event, props);
    } catch {
      /* analytics must never break the app */
    }
  } else {
    // posthog-js chunk still loading — queue briefly, flush on init.
    pending.push([event, props]);
    if (pending.length > 50) pending.shift();
  }
};

const analytics = { initAnalytics, track };

export default analytics;
