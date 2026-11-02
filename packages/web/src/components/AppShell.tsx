import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { isProTier } from "@framecoach/shared";

export function AppShell() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const pro = user ? isProTier(user.tier) : false;

  return (
    <>
      <header className="topnav">
        <NavLink className="brand" to="/app">
          MusePilot
        </NavLink>
        <nav className="nav-links">
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/app/profiles">
            My Profiles
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/app/plans">
            Shot Plans
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/app/cards">
            Shared Cards
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/app/account">
            Account
          </NavLink>
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!pro && (
            <NavLink className="btn btn-copper" to="/app/account#upgrade">
              Upgrade
            </NavLink>
          )}
          {user && (
            <button
              className="btn btn-tertiary"
              type="button"
              onClick={() => {
                signOut();
                nav("/");
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      <Outlet />
    </>
  );
}
