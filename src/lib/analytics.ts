import posthog from "posthog-js";

type CookiePrefs = { essential: boolean; analytics: boolean; marketing: boolean };

function getCookiePrefs(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem("cookie-consent");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let isInit = false;

// PostHog configuration - set these values for your project
const POSTHOG_KEY = ""; // Add your PostHog project API key
const POSTHOG_HOST = "https://app.posthog.com";

export function initAnalytics() {
  const prefs = getCookiePrefs();
  if (!prefs?.analytics) return;

  if (!POSTHOG_KEY || isInit) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    autocapture: false,
    session_recording: {
      maskAllInputs: true,
    },
  });

  isInit = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  const prefs = getCookiePrefs();
  if (!prefs?.analytics) return;
  if (!isInit) initAnalytics();
  if (!isInit) return;

  posthog.capture(event, props);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!isInit) return;
  posthog.identify(userId, traits);
}
