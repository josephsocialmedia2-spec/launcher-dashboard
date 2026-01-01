import React from "react";

export default function IframePane({ title, src }) {
  const [loaded, setLoaded] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    setLoaded(false);
    setBlocked(false);

    // Heuristic: if the iframe can't load due to X-Frame-Options/CSP,
    // browsers often won't fire onLoad reliably with a usable document.
    // We show a fallback after a short timeout.
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 4500);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <section className="pane" aria-label={title}>
      <div className="paneToolbar">
        <div className="paneTitle">{title}</div>
        <div className="paneActions">
          <button className="pill pillMuted" onClick={() => window.location.reload()}>
            Refresh UI
          </button>
          <a className="pill" href={src} target="_blank" rel="noreferrer">
            Apri ↗
          </a>
        </div>
      </div>

      <div className="iframeWrap">
        {!loaded && !blocked && (
          <div className="overlay">
            <div className="spinner" aria-hidden="true" />
            <div className="overlayText">Caricamento…</div>
          </div>
        )}

        {blocked && (
          <div className="overlay overlayError" role="alert">
            <div className="overlayTitle">Impossibile incorporare questa pagina</div>
            <div className="overlayText">
              Il sito potrebbe bloccare l'apertura in iframe (X-Frame-Options / CSP).
              <br />
              Aprila in una nuova scheda.
            </div>
            <div className="overlayActions">
              <a className="pill" href={src} target="_blank" rel="noreferrer">
                Apri ↗
              </a>
            </div>
          </div>
        )}

        <iframe
          key={src}
          className="iframe"
          title={title}
          src={src}
          onLoad={() => {
            setLoaded(true);
            setBlocked(false);
            clearTimeout(timerRef.current);
          }}
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </div>
    </section>
  );
}
