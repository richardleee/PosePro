import { Link } from "react-router-dom";

export function FaqPage() {
  return (
    <div className="page">
      <Link to="/">MusePilot</Link>
      <h1>FAQ</h1>
      <article className="card">
        <h3>Is this an AI photographer?</h3>
        <p>No. MusePilot is a pose and composition guidance tool. It does not shoot, edit, or replace your camera app.</p>
      </article>
      <article className="card" style={{ marginTop: 12 }}>
        <h3>Does the web demo use my camera?</h3>
        <p>No. Live AR coaching is planned for the iOS app only. This site has no viewfinder.</p>
      </article>
      <article className="card" style={{ marginTop: 12 }}>
        <h3>Where is my profile stored?</h3>
        <p>On this device (IndexedDB) by default. Cloud backup is off until you enable it and confirm. Backup stores tags, not photos.</p>
      </article>
      <article className="card" style={{ marginTop: 12 }}>
        <h3>What does Pro include?</h3>
        <p>Up to 5 solo and 2 couple profiles, unlimited shot plans, share cards, and optional tag backup. $4.99/month or $34.99/year after a 7-day trial that auto-renews unless you cancel.</p>
      </article>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="page">
      <h1>Privacy</h1>
      <p>
        Photo preference profiles default to local storage. Cloud sync requires a manual switch and a second
        confirmation. We do not store face photos. Pose matching uses tags, not live image models. You can
        request deletion of account data; we complete cleanup within 30 days.
      </p>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="page">
      <h1>Terms</h1>
      <p>
        MusePilot provides pose and composition guidance. Results are suggestions, not a guarantee of a
        particular photograph. Paid plans auto-renew after the trial unless canceled.
      </p>
    </div>
  );
}
