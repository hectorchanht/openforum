// Dawn Studio sponsored strip — link config.
//
// ONE place to edit. Each entry: `url` + the pill's label/colors.
// Empty `url` ("") hides that pill; fill it in later and the button
// appears automatically — no code changes needed.
const SPONSORED_LINKS = {
  // Hector's own product — always set, never carries rel="sponsored".
  tipJar: {
    label: "☕ Tip jar",
    url: "https://dawnlimited.gumroad.com/l/openq-tip",
    bg: "#F0A832",
    color: "#000",
  },
  // Referral links — render with rel="noopener sponsored".
  wise: {
    label: "Send money abroad",
    url: "https://wise.com/invite/dic/hotungc3",
    bg: "#9FE870",
    color: "#000",
  },
  coinbase: {
    label: "Buy crypto",
    url: "https://advanced.coinbase.com/join/F95MLKD?src=referral-link",
    bg: "#0052FF",
    color: "#fff",
  },
  binance: {
    label: "Trade on Binance",
    url: "https://www.binance.com/activity/referral-entry/CPA?ref=CPA_0027L6WVRQ",
    bg: "#F0B90B",
    color: "#000",
  },
  // Placeholders — urls stay "" until Hector pastes real links in.
  airalo: {
    label: "eSIMs for travel",
    url: "",
    bg: "#00d67d",
    color: "#000",
  },
  koinly: {
    label: "Crypto taxes",
    url: "",
    bg: "#7c5cfc",
    color: "#fff",
  },
  airwallex: {
    label: "Business banking",
    url: "",
    bg: "#ff6b35",
    color: "#000",
  },
};

export const STORAGE_KEY = "dawn_sponsored_hidden";

const hasUrl = (entry) => Boolean(entry && entry.url);

export const hasTipJarLink = () => hasUrl(SPONSORED_LINKS.tipJar);
export const hasWiseLink = () => hasUrl(SPONSORED_LINKS.wise);
export const hasCoinbaseLink = () => hasUrl(SPONSORED_LINKS.coinbase);
export const hasBinanceLink = () => hasUrl(SPONSORED_LINKS.binance);
export const hasAiraloLink = () => hasUrl(SPONSORED_LINKS.airalo);
export const hasKoinlyLink = () => hasUrl(SPONSORED_LINKS.koinly);
export const hasAirwallexLink = () => hasUrl(SPONSORED_LINKS.airwallex);

// Ordered list of referral pills with real urls (tip jar is rendered first,
// separately, because it is Hector's own product, not a referral).
const REFERRAL_ORDER = ["wise", "coinbase", "binance", "airalo", "koinly", "airwallex"];

export const tipJar = () => SPONSORED_LINKS.tipJar;

export const visibleReferralLinks = () =>
  REFERRAL_ORDER.map((id) => ({ id, ...SPONSORED_LINKS[id] })).filter((entry) =>
    hasUrl(entry)
  );

export default SPONSORED_LINKS;

// --- V2 hide flow ---------------------------------------------------------
// The strip renders nothing while the flag is set. The flag is only ever
// written by Settings after a successful license-key verification (or
// cleared by "Show again"). The old honor-system × is gone.
//
// SPONSORED_HIDE_EVENT keeps the strip in sync without a reload: the strip
// re-reads localStorage whenever the settings page changes the flag in the
// same tab; the native "storage" event covers other tabs.
export const SPONSORED_HIDE_EVENT = "dawn:sponsored-hidden-changed";

export const isSponsoredHidden = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // storage unavailable — strip stays visible
  }
};

export const setSponsoredHidden = (hidden) => {
  try {
    if (hidden) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SPONSORED_HIDE_EVENT));
  }
};

// --- Stored tip key ------------------------------------------------------
// The tipper's own license key, persisted on THEIR device so Settings can
// pre-fill it (and copy it for reuse on other devices/apps). This is the
// user's own key on their own device — localStorage is fine. It is never
// sent anywhere except /api/verify-tip, and only on an explicit Verify
// click (never auto-submitted on load).
export const TIP_KEY_STORAGE_KEY = "dawn_tip_license_key";

export const getStoredTipKey = () => {
  try {
    return localStorage.getItem(TIP_KEY_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

export const setStoredTipKey = (key) => {
  try {
    localStorage.setItem(TIP_KEY_STORAGE_KEY, key);
  } catch {
    // ignore
  }
};
