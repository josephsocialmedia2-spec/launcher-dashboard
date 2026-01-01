import React from "react";

const MOCK = {
  kpi: [
    { label: "Lead totali", value: 128 },
    { label: "Appuntamenti", value: 34 },
    { label: "Proposte", value: 12 },
    { label: "Chiusure", value: 5 }
  ],
  byFonte: [
    { label: "Meta Ads", value: 46 },
    { label: "Portali", value: 31 },
    { label: "Referral", value: 22 },
    { label: "Organico", value: 29 }
  ]
};

export default function Gestionale() {
  const [mese, setMese] = React.useState("Questo mese");
  const [agente, setAgente] = React.useState("Tutti");
  const [fonte, setFonte] = React.useState("Tutte");

  // mock filter effect (in-memory only)
  const multiplier =
    (mese === "Questo mese" ? 1 : 0.92) *
    (agente === "Tutti" ? 1 : 0.85) *
    (fonte === "Tutte" ? 1 : 0.9);

  const kpi = MOCK.kpi.map((k) => ({
    ...k,
    value: Math.max(0, Math.round(k.value * multiplier))
  }));

  const byFonte = MOCK.byFonte.map((f) => ({
    ...f,
    value: Math.max(0, Math.round(f.value * multiplier))
  }));

  const max = Math.max(...byFonte.map((x) => x.value), 1);

  return (
    <section className="pane">
      <div className="paneToolbar">
        <div className="paneTitle">gestionale</div>
        <div className="paneActions">
          <span className="pill pillMuted">Mock data</span>
        </div>
      </div>

      <div className="card grid2">
        <div className="field">
          <label className="label">Mese</label>
          <select className="select" value={mese} onChange={(e) => setMese(e.target.value)}>
            <option>Questo mese</option>
            <option>Mese scorso</option>
            <option>Ultimi 90 giorni</option>
          </select>
        </div>

        <div className="field">
          <label className="label">Agente</label>
          <select className="select" value={agente} onChange={(e) => setAgente(e.target.value)}>
            <option>Tutti</option>
            <option>Agente A</option>
            <option>Agente B</option>
          </select>
        </div>

        <div className="field">
          <label className="label">Fonte</label>
          <select className="select" value={fonte} onChange={(e) => setFonte(e.target.value)}>
            <option>Tutte</option>
            <option>Meta Ads</option>
            <option>Portali</option>
            <option>Referral</option>
            <option>Organico</option>
          </select>
        </div>

        <div className="field">
          <label className="label">Stato</label>
          <input className="input" value="Solo front-end" readOnly />
        </div>
      </div>

      <div className="kpiGrid">
        {kpi.map((k) => (
          <div className="kpiCard" key={k.label}>
            <div className="kpiLabel">{k.label}</div>
            <div className="kpiValue">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="sectionTitle">Lead per fonte</div>
        <div className="bars">
          {byFonte.map((f) => (
            <div className="barRow" key={f.label}>
              <div className="barLabel">{f.label}</div>
              <div className="barTrack" aria-hidden="true">
                <div className="barFill" style={{ width: `${(f.value / max) * 100}%` }} />
              </div>
              <div className="barValue">{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
