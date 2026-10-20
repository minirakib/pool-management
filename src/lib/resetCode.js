/**
 * Sends the Forgot password code by email or SMS.
 *
 * The app has no server of its own, so delivery goes to an HTTP endpoint you provide
 * (for example a Netlify Function that calls an email API and an SMS gateway). Set it at build time:
 *
 *   VITE_RESET_CODE_ENDPOINT=/.netlify/functions/send-reset-code
 *
 * It receives POST JSON { channel: "email" | "sms", to, code, name, club } and must reply 2xx once sent.
 * Without it the app runs in demo mode: nothing is sent and the page shows the code on screen.
 */
const ENDPOINT = import.meta.env.VITE_RESET_CODE_ENDPOINT || "";

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 5;
export const RESEND_AFTER_MS = 30_000;
export const deliveryConfigured = !!ENDPOINT;

/** Random 6-digit code from the browser's secure random source. */
export function generateCode() {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % 10 ** CODE_LENGTH).padStart(CODE_LENGTH, "0");
}

/** Resolves { demo: true } when no endpoint is set; throws a user-facing Error when sending fails. */
export async function sendResetCode({ channel, to, code, name, club }) {
  if (!ENDPOINT) return { demo: true };
  let response;
  try {
    response = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, to, code, name, club }) });
  } catch {
    throw new Error("No internet connection. Connect and try again.");
  }
  if (!response.ok) throw new Error(`The code could not be sent by ${channel === "email" ? "email" : "SMS"}. Try again in a minute.`);
  return { demo: false };
}
