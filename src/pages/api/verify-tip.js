import { createHash } from "node:crypto";

// Verify a Gumroad tip-jar license key so the tipper can hide the sponsored
// strip.
//
// POST { licenseKey } -> { ok: true } (plus admin: true when the master key
// was used), or { ok: false }. Fail closed on every error path: empty /
// overlong input, hash mismatch, Gumroad success=false, refunded or
// charged-back purchase, non-200, or any network exception.
//
// The master key is compared as SHA-256 hex (hash-in-code, never plaintext —
// the repos are public). Never logs the input and exposes nothing beyond
// ok/admin.
const ADMIN_KEY_SHA256 =
  "67d2d8519b0160af28a8d8f6c3cc97d810fda37161d2b10b1359d480c4ecad77";

const PRODUCT_PERMALINK = "openq-tip";
const GUMROAD_VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";
const MAX_KEY_LEN = 200;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const raw = req.body && req.body.licenseKey;
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key || key.length > MAX_KEY_LEN) {
    return res.status(200).json({ ok: false });
  }

  // Admin master key — bypasses Gumroad so Hector can always unlock.
  const digest = createHash("sha256").update(key, "utf8").digest("hex");
  if (digest === ADMIN_KEY_SHA256) {
    return res.status(200).json({ ok: true, admin: true });
  }

  // Gumroad license check. /v2/licenses/verify needs no access token —
  // the product permalink + the buyer's key are the credentials.
  try {
    const body = new URLSearchParams({
      product_permalink: PRODUCT_PERMALINK,
      license_key: key,
    });
    const gumroad = await fetch(GUMROAD_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!gumroad.ok) return res.status(200).json({ ok: false });
    const data = await gumroad.json();
    if (
      data &&
      data.success === true &&
      data.refunded !== true &&
      data.chargedback !== true
    ) {
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ ok: false });
  } catch {
    // network / API / parse error — fail closed
    return res.status(200).json({ ok: false });
  }
}
