import { useState, type ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="actions">
          <button className="btn btn-tertiary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog">
      <div className="modal">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="btn btn-tertiary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function start(interval: "month" | "year") {
    setBusy(true);
    setErr("");
    try {
      const { api } = await import("../lib/session");
      const data = await api<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ interval }),
      });
      window.location.href = data.url;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Upgrade to MusePilot Pro</h3>
        <p>
          7-day free trial, then $4.99/month or $34.99/year. Subscription renews automatically until you
          cancel. Pro unlocks extra profiles, unlimited shot plans, share cards, and optional encrypted tag
          backup.
        </p>
        {err && <p className="quota">{err}</p>}
        <div className="actions">
          <button className="btn btn-copper" disabled={busy} type="button" onClick={() => start("month")}>
            Trial · monthly
          </button>
          <button className="btn btn-secondary" disabled={busy} type="button" onClick={() => start("year")}>
            Trial · yearly
          </button>
          <button className="btn btn-tertiary" type="button" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
