import { useState } from "react";
import { resetPassword } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Icon from "@/components/Icon.jsx";
import { findUserByContact, hashPassword, isEmail, maskContact } from "@/lib/auth.js";
import { CODE_LENGTH, CODE_TTL_MS, generateCode, MAX_ATTEMPTS, RESEND_AFTER_MS, sendResetCode } from "@/lib/resetCode.js";
import { useNow } from "@/hooks/useNow.js";

const STEPS = ["Find account", "Enter code", "New password"];

/**
 * Forgot password, in three steps: email or phone → 6-digit code sent there → new password.
 * onDone(username) returns to sign-in after a reset; onBack() returns without one.
 */
export default function ForgotPasswordPage({ onBack, onDone }) {
  const { users, settings } = useStore();
  const { run } = useStoreApi();
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState("");
  const [request, setRequest] = useState(null); // { userId, code, channel, expiresAt, sentAt, attempts, demo }
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /** Creates a fresh code for the account and sends it to the address that was typed. */
  const send = async (user) => {
    const channel = isEmail(contact) ? "email" : "sms";
    const next = generateCode();
    const { demo } = await sendResetCode({ channel, to: contact.trim(), code: next, name: user.name, club: settings.clubName });
    const now = Date.now();
    setRequest({ userId: user.id, code: next, channel, expiresAt: now + CODE_TTL_MS, sentAt: now, attempts: 0, demo });
    setCode("");
  };

  const guard = (fn) => async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const findAccount = guard(async () => {
    const user = findUserByContact(users, contact);
    if (!user) throw new Error(isEmail(contact) ? "No account uses that email address." : "No account uses that phone number.");
    await send(user);
    setStep(1);
  });

  const resend = guard(async () => {
    const user = users.find((u) => u.id === request.userId);
    if (!user) throw new Error("That account no longer exists.");
    await send(user);
  });

  const checkCode = guard(async () => {
    if (Date.now() > request.expiresAt) throw new Error("This code has expired. Send a new one.");
    if (request.attempts >= MAX_ATTEMPTS) throw new Error("Too many wrong codes. Send a new one.");
    if (code !== request.code) {
      setRequest((r) => ({ ...r, attempts: r.attempts + 1 }));
      setCode("");
      const left = MAX_ATTEMPTS - request.attempts - 1;
      throw new Error(left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Send a new one.");
    }
    setStep(2);
  });

  const savePassword = guard(async () => {
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (password !== confirm) throw new Error("The two passwords do not match.");
    const user = users.find((u) => u.id === request.userId);
    if (!user) throw new Error("That account no longer exists.");
    run(resetPassword, user.id, await hashPassword(user.username, password));
    onDone(user.username);
  });

  return (
    <form className="login-card" onSubmit={[findAccount, checkCode, savePassword][step]}>
      <button type="button" className="login-back" onClick={step === 0 ? onBack : () => { setStep(0); setError(""); }}>
        <Icon name="undo" />{step === 0 ? "Back to sign in" : "Start again"}
      </button>
      <h1>Forgot password</h1>
      <ol className="login-steps" aria-label="Steps">
        {STEPS.map((label, i) => <li key={label} className={i === step ? "active" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}><span>{i < step ? <Icon name="check" /> : i + 1}</span>{label}</li>)}
      </ol>

      {step === 0 && <>
        <p className="muted">Enter the email or phone number saved on your account. We will send you a {CODE_LENGTH}-digit code.</p>
        <label className="field">
          <span>Email or phone number</span>
          <input value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck="false" placeholder="you@example.com or 01XXXXXXXXX" required autoFocus />
        </label>
      </>}

      {step === 1 && request && <>
        <p className="muted">We sent a {CODE_LENGTH}-digit code by {request.channel === "email" ? "email" : "SMS"} to <strong>{maskContact(contact.trim())}</strong>. It works for 10 minutes.</p>
        {request.demo && (
          <p className="login-demo" role="status">
            <Icon name="bell" /><span>Demo mode: no email or SMS service is connected, so here is the code: <b>{request.code}</b></span>
          </p>
        )}
        <label className="field">
          <span>Verification code</span>
          <input className="login-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH} placeholder={"•".repeat(CODE_LENGTH)} required autoFocus />
        </label>
        <ResendButton sentAt={request.sentAt} busy={busy} onResend={resend} />
      </>}

      {step === 2 && <>
        <p className="muted">Choose a new password with at least 6 characters.</p>
        <label className="field"><span>New password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" required autoFocus /></label>
        <label className="field"><span>Confirm password</span><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></label>
      </>}

      {error && <p className="login-error" role="alert"><Icon name="alert" />{error}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={busy || (step === 1 && code.length !== CODE_LENGTH)}>
        <Icon name="check" />{busy ? "Please wait…" : ["Send code", "Verify code", "Reset password"][step]}
      </button>
    </form>
  );
}

/** "Resend code" unlocks 30 seconds after the last send, with a countdown until then. */
function ResendButton({ sentAt, busy, onResend }) {
  const now = useNow(1000);
  const wait = Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000);
  return (
    <button type="button" className="login-link" onClick={onResend} disabled={busy || wait > 0}>
      {wait > 0 ? `Resend code in ${wait}s` : "Didn't get it? Resend code"}
    </button>
  );
}
