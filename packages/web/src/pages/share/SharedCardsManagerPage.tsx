import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCards, putCard } from "../../storage/db";
import type { LocalShareCard } from "../../types";
import { useAuth } from "../../lib/auth";
import { isProTier } from "@framecoach/shared";
import { UpgradeModal } from "../../components/Modals";
import { api } from "../../lib/session";

export function SharedCardsManagerPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LocalShareCard[]>([]);
  const [upgrade, setUpgrade] = useState(false);

  async function load() {
    const local = await listCards();
    if (isProTier(user?.tier ?? "free")) {
      try {
        const remote = await api<{ cards: { id: string; url: string; revokedAt: string | null }[] }>("/api/share");
        const merged = remote.cards.map((c) => {
          const prev = local.find((l) => l.id === c.id);
          return {
            id: c.id,
            url: c.url,
            planId: prev?.planId || "",
            revoked: Boolean(c.revokedAt),
            createdAt: prev?.createdAt || Date.now(),
          };
        });
        setRows(merged);
        return;
      } catch {
        /* local fallback */
      }
    }
    setRows(local);
  }

  useEffect(() => {
    if (!isProTier(user?.tier ?? "free")) {
      setUpgrade(true);
    }
    load();
  }, [user]);

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
  }

  async function revoke(id: string) {
    await api(`/api/share/${id}/revoke`, { method: "POST" });
    const card = rows.find((r) => r.id === id);
    if (card) await putCard({ ...card, revoked: true });
    load();
  }

  return (
    <div className="page">
      <h1>Shared cards</h1>
      <p className="lede">Read-only links. Visitors do not need an account and cannot edit your preferences.</p>
      <div className="form-grid" style={{ marginTop: 16 }}>
        {rows.map((c) => (
          <article className="card" key={c.id}>
            <p className="sans">{c.revoked ? "Revoked" : c.url}</p>
            <div className="actions">
              <button className="btn btn-secondary" type="button" disabled={c.revoked} onClick={() => copy(c.url)}>
                Copy link
              </button>
              <a className="btn btn-secondary" href={c.url} target="_blank" rel="noreferrer">
                Preview
              </a>
              <button className="btn btn-tertiary" type="button" disabled={c.revoked} onClick={() => revoke(c.id)}>
                Revoke
              </button>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p>No cards yet. Generate one from a shot plan.</p>}
      </div>
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
    </div>
  );
}
