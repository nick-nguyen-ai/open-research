import { useCallback, useEffect, useRef, useState } from "react";

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | ready | unavailable
  const [active, setActive] = useState(0);
  const [indexed, setIndexed] = useState(null);
  const pagefind = useRef(null);
  const inputRef = useRef(null);

  const ensurePagefind = useCallback(async () => {
    if (pagefind.current || status === "unavailable") return;
    fetch("/pagefind/pagefind-entry.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((entry) => {
        if (!entry) return;
        const n = Object.values(entry.languages ?? {}).reduce((sum, l) => sum + (l.page_count ?? 0), 0);
        setIndexed(n);
      })
      .catch(() => {}); // dev server: entry json only exists after a full build — omit the count line
    try {
      const pf = await import(/* @vite-ignore */ "/pagefind/pagefind.js");
      await pf.init();
      pagefind.current = pf;
      setStatus("ready");
    } catch {
      setStatus("unavailable"); // dev server: index only exists after a full build
    }
  }, [status]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e) => { if (e.target.closest("[data-search-open]")) setOpen(true); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, []);

  useEffect(() => {
    if (!open) return;
    ensurePagefind();
    inputRef.current?.focus();
  }, [open, ensurePagefind]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pagefind.current || !query.trim()) { setResults([]); return; }
      const search = await pagefind.current.debouncedSearch(query);
      if (!search || cancelled) return;
      const data = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
      if (!cancelled) setResults(data);
    })();
    return () => { cancelled = true; };
  }, [query, status]);

  useEffect(() => { setActive(0); }, [results]);

  useEffect(() => {
    if (!open) return;
    const onNav = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0))); // clamp at last hit
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0)); // clamp at first hit
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = results[active];
        if (hit) window.location.href = hit.url;
      }
    };
    document.addEventListener("keydown", onNav);
    return () => document.removeEventListener("keydown", onNav);
  }, [open, results, active]);

  if (!open) return null;
  return (
    <div className="sovl" role="dialog" aria-modal="true" aria-label="Search"
         onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="spanel">
        <div className="sline">
          <span className="caps" style={{ color: "var(--oxblood)", letterSpacing: ".14em" }}>Search</span>
          <input ref={inputRef} className="sq" value={query} placeholder="Search the corpus…"
                 onChange={(e) => setQuery(e.target.value)} />
          <button className="kbd" type="button" onClick={() => setOpen(false)}>esc</button>
        </div>
        {status === "unavailable" && (
          <p className="smsg">Search index not built — run <code>npm run build -w site</code> and serve <code>dist/</code>.</p>
        )}
        {results.map((r, i) => (
          <a key={r.url} className={i === active ? "shit sh-active" : "shit"} href={r.url}
             onMouseEnter={() => setActive(i)}>
            <h4 dangerouslySetInnerHTML={{ __html: r.excerpt }} />
            <div className="sm">{r.meta?.tier ?? ""} {r.meta?.category ? `· ${r.meta.category}` : ""} {r.meta?.evidence ? `· ${r.meta.evidence}` : ""}</div>
          </a>
        ))}
        <div className="sfoot">
          <span>↵ open</span><span>esc close</span>
          {indexed != null && <span style={{ marginLeft: "auto" }}>{indexed} documents indexed at build</span>}
        </div>
      </div>
    </div>
  );
}
