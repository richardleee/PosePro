import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/session";
import { Wireframe } from "../../components/Wireframe";
import type { ShotTemplate } from "@framecoach/shared";

interface Payload {
  profileSummary: {
    name: string;
    aesthetic: string[];
    composition: string[];
    dislikes: string[];
    notes: string;
  };
  destination?: string;
  poses: ShotTemplate[];
}

export function SharedCardPublicPage() {
  const { publicId } = useParams();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ payload: Payload }>(`/api/share/public/${publicId}`)
      .then((d) => setPayload(d.payload))
      .catch((e) => setErr((e as Error).message));
  }, [publicId]);

  if (err) {
    return (
      <div className="public-card">
        <h1>Unavailable</h1>
        <p>{err}</p>
        <Link to="/">MusePilot</Link>
      </div>
    );
  }
  if (!payload) return <div className="public-card">Loading…</div>;

  return (
    <div className="public-card">
      <p className="sans quota">MusePilot · read-only guidance</p>
      <h1>My Photo Preferences &amp; Recommended Poses</h1>
      {payload.destination && <p className="lede">{payload.destination}</p>}
      <article className="card">
        <h3>{payload.profileSummary.name}</h3>
        <p>Aesthetic: {payload.profileSummary.aesthetic.join(", ") || "—"}</p>
        <p>Composition: {payload.profileSummary.composition.join(", ") || "—"}</p>
        <p>Avoid: {payload.profileSummary.dislikes.join(", ") || "—"}</p>
        {payload.profileSummary.notes && <p>{payload.profileSummary.notes}</p>}
      </article>
      <div className="form-grid" style={{ marginTop: 16 }}>
        {payload.poses.slice(0, 3).map((s) => (
          <article className="card shot" key={s.id}>
            <Wireframe kind={s.wireframe} />
            <div>
              <h3>{s.compositionName}</h3>
              <p>{s.posePrompt}</p>
              <p style={{ marginTop: 8 }}>{s.photographerTip}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="footer-note">This page cannot be edited. Camera guidance only — not a photographer-for-hire.</p>
    </div>
  );
}
