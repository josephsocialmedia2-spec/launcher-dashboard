import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ITEMS } from "../links.js";

export default function Topbar() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const active =
    ITEMS.find((it) => it.path === location.pathname) ||
    ITEMS.find((it) => it.path === "/acquisizione");

  return (
    <>
      <header className="topbar">
        <button
          className="iconBtn hamburger"
          aria-label="Apri menu"
          onClick={() => setOpen(true)}
        >
          <span className="hamburgerLines" aria-hidden="true" />
        </button>

        <div className="topbarTitle">
          <div className="topbarTitlePrimary">Dashboard</div>
          <div className="topbarTitleSecondary">{active?.label ?? ""}</div>
        </div>

        <div className="topbarRight">
          {active?.url ? (
            <a
              className="pill"
              href={active.url}
              target="_blank"
              rel="noreferrer"
              title="Apri in nuova scheda"
            >
              Apri ↗
            </a>
          ) : (
            <span className="pill pillMuted" title="Solo UI">
              Local
            </span>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`drawerBackdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawerHeader">
          <div className="drawerBrand">Programmi</div>
          <button className="iconBtn" aria-label="Chiudi menu" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <nav className="drawerNav">
          {ITEMS.map((it) => {
            const isActive = location.pathname === it.path;
            return (
              <button
                key={it.key}
                className={`drawerItem ${isActive ? "active" : ""}`}
                onClick={() => {
                  navigate(it.path);
                  setOpen(false);
                }}
              >
                <span className="appIcon" aria-hidden="true">▦</span>
                <span className="drawerLabel">{it.label}</span>
                <span className={`check ${isActive ? "on" : ""}`} aria-hidden="true">✓</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
