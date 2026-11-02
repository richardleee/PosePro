import { Link } from "react-router-dom";
import { track } from "../lib/session";
import { useEffect } from "react";

export function LandingPage() {
  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <div className="page">
      <header className="topnav">
        <Link className="brand" to="/">
          MusePilot
        </Link>
        <nav className="nav-links">
          <Link to="/faq">FAQ</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/login">Sign in</Link>
        </nav>
        <Link className="btn btn-primary" to="/login">
          Start Free Trial
        </Link>
      </header>
      <section className="landing-hero">
        <div>
          <p className="sans quota">Pose &amp; composition guidance</p>
          <h1>Plan the portrait before anyone lifts a camera.</h1>
          <p className="lede">
            MusePilot helps you capture how you like to be photographed — then builds a travel shot list
            your friend can follow. It does not replace your phone camera, and this web demo has no live
            viewfinder.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/login">
              Start Free Trial
            </Link>
            <Link className="btn btn-secondary" to="/faq">
              How it works
            </Link>
          </div>
        </div>
        <div className="poster" role="img" aria-label="Abstract composition guide" />
      </section>
      <div className="grid-3" style={{ marginTop: 28 }}>
        <article className="card">
          <h3>Preference profiles</h3>
          <p>Record height, body tags, likes, and hard nos so guidance stays personal — stored on this device by default.</p>
        </article>
        <article className="card">
          <h3>Pre-shoot planner</h3>
          <p>Pick a destination and scene. Get 3–5 composition setups with pose notes and photographer tips.</p>
        </article>
        <article className="card">
          <h3>Share cards (Pro)</h3>
          <p>Send a read-only page to whoever is holding the camera. They do not need an account.</p>
        </article>
      </div>
      <p className="footer-note">
        Profiles stay in your browser unless you turn on encrypted cloud backup. Camera frames are never
        uploaded — this web product has no camera at all.
      </p>
    </div>
  );
}
