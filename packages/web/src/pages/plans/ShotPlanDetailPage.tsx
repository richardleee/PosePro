import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPlan, getProfile, putCard } from "../../storage/db";
import type { LocalPlan, LocalProfile } from "../../types";
import { Wireframe } from "../../components/Wireframe";
import { useAuth } from "../../lib/auth";
import { isProTier } from "@framecoach/shared";
import { UpgradeModal } from "../../components/Modals";
import { api, track } from "../../lib/session";

export function ShotPlanDetailPage() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPlan(id).then(async (p) => {
      setPlan(p ?? null);
      if (p) setProfile((await getProfile(p.profileId)) ?? null);
    });
  }, [id]);

  useEffect(() => {
    if (qs.get("share") === "1" && plan) void share();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, qs]);

  async function share() {
    if (!isProTier(user?.tier ?? "free")) {
      setUpgrade(true);
      return;
    }
    if (!plan || !profile) return;
    const data = await api<{ id: string; url: string }>("/api/share", {
      method: "POST",
      body: JSON.stringify({
        payload: {
          profileSummary: {
            name: profile.name,
            aesthetic: profile.aesthetic,
            composition: profile.composition,
            dislikes: profile.dislikes,
            notes: profile.notes,
          },
          destination: plan.destination,
          poses: plan.shots.slice(0, 3),
        },
      }),
    });
    await putCard({ id: data.id, url: data.url, planId: plan.id, revoked: false, createdAt: Date.now() });
    setShareUrl(data.url);
    track("share_card_created");
  }

  if (!plan) return <div className="page">Shot plan not found.</div>;

  return (
    <div className="page">
      <Link className="btn btn-tertiary" to="/app/plans">
        Back
      </Link>
      <h1>{plan.destination}</h1>
      <p className="quota">
        {plan.scene} · {profile?.name} {plan.referenceName ? `· local ref ${plan.referenceName}` : ""}
      </p>
      <div className="form-grid" style={{ marginTop: 18 }}>
        {plan.shots.map((s) => (
          <article className="card shot" key={s.id}>
            <Wireframe kind={s.wireframe} />
            <div>
              <h3>{s.compositionName}</h3>
              <p>
                <strong>Pose.</strong> {s.posePrompt}
              </p>
              <p style={{ marginTop: 8 }}>
                <strong>Photographer tip.</strong> {s.photographerTip}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="actions">
        <button className="btn btn-secondary" type="button" onClick={() => setSaved(true)}>
          Save Offline
        </button>
        <button className="btn btn-primary" type="button" onClick={() => void share()}>
          Generate Share Card
        </button>
      </div>
      {saved && (
        <p className="quota">Saved in this browser. You can reopen this list without a network connection.</p>
      )}
      {shareUrl && (
        <p className="banner">
          Share link: <a href={shareUrl}>{shareUrl}</a>
        </p>
      )}
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
    </div>
  );
}
