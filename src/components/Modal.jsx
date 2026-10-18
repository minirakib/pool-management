import { useCallback, useEffect, useRef, useState } from "react";
import { useUi } from "../app/ui.jsx";
import Icon from "./Icon.jsx";

const FOCUSABLE = "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])";

/**
 * Same markup and behaviour as the original openModal(): backdrop click and Esc close it,
 * Tab is trapped inside, and the first control gets focus.
 * Pass onSubmit to wrap the body in a form; it receives the form values as an object.
 */
export default function Modal({ title, subtitle, children, footer, wide = false, xl = false, onSubmit, error = "", className = "" }) {
  const { closeModal } = useUi();
  const ref = useRef(null);

  // An element marked data-autofocus wins (e.g. the Start button, so Enter starts a session).
  useEffect(() => {
    (ref.current.querySelector("[data-autofocus]") || ref.current.querySelector("input,select,textarea,button"))?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") closeModal();
      if (event.key !== "Tab") return;
      const focusable = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeModal]);

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    onSubmit(Object.fromEntries(new FormData(form).entries()));
  };

  const content = (
    <>
      <div className="modal-body">
        <div className={`form-error${error ? " show" : ""}`} role="alert">{error}</div>
        {children}
      </div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </>
  );

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && closeModal()}>
      <section ref={ref} className={`modal${xl ? " modal-xl" : wide ? " modal-wide" : ""}${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div><h2 id="modal-title">{title}</h2><p>{subtitle || ""}</p></div>
          <button className="icon-button" onClick={closeModal} aria-label="Close dialog"><Icon name="x" /></button>
        </header>
        {onSubmit ? <form noValidate onSubmit={submit}>{content}</form> : content}
      </section>
    </div>
  );
}

export function FormFooter({ label = "Save changes", children, autofocus = false }) {
  const { closeModal } = useUi();
  return (
    <>
      <button className="button" type="button" onClick={closeModal}>Cancel</button>
      {children}
      <button className="button button-primary" type="submit" data-autofocus={autofocus || undefined}>{label}</button>
    </>
  );
}

export function CloseFooter({ label = "Close", children }) {
  const { closeModal } = useUi();
  return <>{children}<button className="button button-quiet" onClick={closeModal}>{label}</button></>;
}

/**
 * For form modals: attempt(fn) runs fn (which calls the store); on success it shows the returned
 * message and closes the modal; on error it shows the message inside the form, like the original.
 */
export function useFormAttempt() {
  const { notify, closeModal } = useUi();
  const [error, setError] = useState("");
  const attempt = useCallback((fn) => {
    try {
      const message = fn();
      closeModal();
      if (typeof message === "string") notify(message);
    } catch (err) {
      setError(err.message);
      notify(err.message, "error", "Check the form");
    }
  }, [closeModal, notify]);
  return { error, attempt };
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
  const { closeModal } = useUi();
  return (
    <Modal
      title={title}
      subtitle="Please confirm this action."
      footer={
        <>
          <button className="button" onClick={closeModal}>Cancel</button>
          <button className={`button ${danger ? "button-danger" : "button-primary"}`} onClick={() => { closeModal(); onConfirm(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>{message}</p>
    </Modal>
  );
}
