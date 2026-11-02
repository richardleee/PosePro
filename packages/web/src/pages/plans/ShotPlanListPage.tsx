import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deletePlan, listPlans, getProfile } from "../../storage/db";
import type { LocalPlan } from "../../types";
import { ConfirmModal, UpgradeModal } from "../../components/Modals";
import { useAuth } from "../../lib/auth";
import { isProTier } from "@framecoach/shared";

export function ShotPlanListPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<(LocalPlan & { profileName?: string })[]>([]);
  const [del, setDel] = useState<LocalPlan | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  async function load() {
    const plans = await listPlans();
    const withNames = await Promise.all(
      plans.map(async (p) => ({ ...p, profileName: (await getProfile(p.profileId))?.name }))
    );
    setRows(withNames.sort((a, b) => b.createdAt - a.createdAt));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="row-between">
        <h1>Shot plans</h1>
        <Link className="btn btn-primary" to="/app/plans/new">
          + Create New Shot Plan
        </Link>
      </div>
      <div className="grid-2" style={{ marginTop: 20 }}>
        {rows.map((p) => (
          <article className="card" key={p.id}>
            <h3>{p.destination}</h3>
            <p>
              {p.scene} · {p.profileName || "Profile"}
            </p>
            <div className="actions">
              <Link className="btn btn-secondary" to={`/app/plans/${p.id}`}>
                Preview
              </Link>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  if (!isProTier(user?.tier ?? "free")) return setUpgrade(true);
                  nav(`/app/plans/${p.id}?share=1`);
                }}
              >
                Share
              </button>
              <button className="btn btn-tertiary" type="button" onClick={() => setDel(p)}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p>No shot plans yet.</p>}
      </div>
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
      {del && (
        <ConfirmModal
          title="Delete shot plan?"
          body="This list will be removed from this browser."
          confirmLabel="Delete"
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            await deletePlan(del.id);
            setDel(null);
            load();
          }}
        />
      )}
    </div>
  );
}
