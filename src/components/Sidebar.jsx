import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ items, activePath }) {
  return (
    <aside className="sidebar" aria-label="Menu">
      <div className="sidebarHeader">
        <div className="sidebarBrand">
          <span className="brandMark" aria-hidden="true">▣</span>
          <span className="brandText">Programmi</span>
        </div>
      </div>

      <nav className="sidebarNav">
        {items.map((it) => (
          <NavLink
            key={it.key}
            to={it.path}
            className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
            end
          >
            <span className="appIcon" aria-hidden="true">▦</span>
            <span className="navLabel">{it.label}</span>
            <span className={`check ${activePath === it.path ? "on" : ""}`} aria-hidden="true">
              ✓
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="muted">Front-end only</div>
        <div className="muted">No backend • No storage</div>
      </div>
    </aside>
  );
}
