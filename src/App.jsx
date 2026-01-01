import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DEFAULT_PATH, ITEMS } from "./links.js";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import IframePane from "./components/IframePane.jsx";
import Gestionale from "./pages/Gestionale.jsx";

export default function App() {
  const location = useLocation();

  // Map current route to item
  const activeItem =
    ITEMS.find((it) => location.pathname === it.path) ||
    ITEMS.find((it) => it.path === DEFAULT_PATH);

  return (
    <div className="app">
      <Topbar />
      <div className="layout">
        <Sidebar items={ITEMS} activePath={activeItem?.path} />
        <main className="main" role="main">
          <Routes>
            <Route path="/" element={<Navigate to={DEFAULT_PATH} replace />} />
            <Route path="/gestionale" element={<Gestionale />} />
            <Route
              path="/acquisizione"
              element={<IframePane title="acquisizione" src={ITEMS[0].url} />}
            />
            <Route
              path="/lead"
              element={<IframePane title="lead" src={ITEMS.find(i=>i.key==="lead")?.url} />}
            />
            <Route
              path="/promozione"
              element={<IframePane title="promozione" src={ITEMS.find(i=>i.key==="promozione")?.url} />}
            />
            <Route
              path="/digital-sale-immobiliare"
              element={
                <IframePane
                  title="Digital-Sale-Immobiliare"
                  src={ITEMS.find(i=>i.key==="digital-sale-immobiliare")?.url}
                />
              }
            />
            <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
