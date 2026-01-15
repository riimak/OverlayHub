"use client";

import { useEffect, useMemo, useState } from "react";

function courtIdFromPathname(pathname: string) {
  // expected: /rankedin/court/<courtId>/control
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 4 && parts[0] === "rankedin" && parts[1] === "court") {
    return parts[2] || "";
  }
  return "";
}

type TournamentMatch = {
  Id: number;
  Date: string;
  Court: string;
  Challenger?: { Name?: string; CountryShort?: string };
  Challenged?: { Name?: string; CountryShort?: string };
  State?: number;
  IsMatchScheduled?: boolean;
  MatchResult?: any;
};

export default function ControlPage() {
  const [courtId, setCourtId] = useState<string>("");

  const [settings, setSettings] = useState<any>({
    viewMode: "auto",
    swap: false,
    name1: "",
    name2: "",
    leftColor: "",
    rightColor: "",
    logoOpacity: 0.7,
    logoScale: 0.9,
    tournamentName: "",
    subtitle: "",

    // NEW: tournament programming
    tournamentId: "",
    tournamentLang: "en",
    tournamentCourtName: "",
    pinnedNowMatchId: "",
    pinnedNextMatchId: ""
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

  // Tournament UI state
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [tournamentCourts, setTournamentCourts] = useState<string[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(false);

  useEffect(() => {
    const id = courtIdFromPathname(window.location.pathname);
    setCourtId(id);
  }, []);

  const settingsUrl = useMemo(
    () => (courtId ? `/api/rankedin/court/${courtId}/settings` : ""),
    [courtId]
  );
  const triggerUrl = useMemo(
    () => (courtId ? `/api/rankedin/court/${courtId}/trigger` : ""),
    [courtId]
  );
  const dataUrl = useMemo(
    () => (courtId ? `/api/rankedin/court/${courtId}/data` : ""),
    [courtId]
  );

  // Load current settings once we have courtId
  useEffect(() => {
    if (!settingsUrl) return;

    (async () => {
      setStatus("Loading settings…");
      const r = await fetch(settingsUrl, { cache: "no-store" });
      if (r.ok) {
        const s = await r.json();
        setSettings((prev: any) => ({ ...prev, ...s }));
        setStatus("Loaded.");
      } else {
        setStatus(`Failed to load settings (HTTP ${r.status}).`);
      }
    })();
  }, [settingsUrl]);

  async function save(nextSettings?: any) {
    if (!settingsUrl) return;

    const payload = nextSettings ?? settings;

    setSaving(true);
    setStatus("Saving…");
    try {
      const r = await fetch(settingsUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        setStatus(`Save failed (HTTP ${r.status}).`);
        return;
      }

      setSettings(payload);
      setStatus("Saved.");
    } finally {
      setSaving(false);
    }
  }

  async function trigger(type: string) {
    if (!triggerUrl) return;

    setStatus(`Triggering ${type}…`);
    const r = await fetch(triggerUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, target: "score" })
    });

    setStatus(r.ok ? `Triggered ${type}.` : `Trigger failed (HTTP ${r.status}).`);
  }

  async function fetchTournament() {
    const tournamentId = String(settings.tournamentId ?? "").trim();
    const lang = String(settings.tournamentLang ?? "en").trim() || "en";

    if (!tournamentId) {
      setStatus("Enter tournamentId first.");
      return;
    }

    setLoadingTournament(true);
    setStatus("Loading tournament matches…");

    try {
      const r = await fetch(`/api/rankedin/tournament/${encodeURIComponent(tournamentId)}/matches?lang=${encodeURIComponent(lang)}&readonly=true`, {
        cache: "no-store"
      });

      if (!r.ok) {
        setStatus(`Failed to load tournament (HTTP ${r.status}).`);
        return;
      }

      const data = await r.json();
      const matches: TournamentMatch[] = Array.isArray(data?.Matches) ? data.Matches : [];

      const courts = Array.from(
        new Set(matches.map((m) => String(m?.Court ?? "")).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      setTournamentMatches(matches);
      setTournamentCourts(courts);

      setStatus(`Loaded tournament: ${matches.length} matches.`);
    } finally {
      setLoadingTournament(false);
    }
  }

  const courtMatches = useMemo(() => {
    const courtName = String(settings.tournamentCourtName ?? "");
    if (!courtName) return [];
    return tournamentMatches
      .filter((m) => String(m?.Court ?? "") === courtName)
      .sort((a, b) => String(a?.Date ?? "").localeCompare(String(b?.Date ?? "")));
  }, [tournamentMatches, settings.tournamentCourtName]);

  function matchLabel(m: TournamentMatch) {
    const p1 = m?.Challenger?.Name ?? "—";
    const p2 = m?.Challenged?.Name ?? "—";
    const dt = typeof m?.Date === "string" ? m.Date : "";
    const id = m?.Id ?? 0;
    return `#${id} • ${dt} • ${p1} vs ${p2}`;
  }

  return (
    <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif", maxWidth: 980 }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Overlay Control</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ opacity: 0.8 }}>
          Court: <b>{courtId || "—"}</b>
        </div>

        {!courtId && (
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>
            Could not read courtId from URL. Open this page as /rankedin/court/&lt;courtId&gt;/control
          </div>
        )}
      </div>

      <div style={{ opacity: 0.75, marginBottom: 14 }}>{status}</div>

      {/* Tournament programming */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          marginBottom: 16
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 10, fontSize: 16 }}>Tournament programming (optional)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            Tournament ID
            <input
              value={settings.tournamentId ?? ""}
              onChange={(e) => setSettings({ ...settings, tournamentId: e.target.value })}
              placeholder="e.g. 61922"
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>

          <label>
            Language
            <select
              value={settings.tournamentLang ?? "en"}
              onChange={(e) => setSettings({ ...settings, tournamentLang: e.target.value })}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            >
              <option value="en">en</option>
              <option value="hr">hr</option>
              <option value="de">de</option>
              <option value="fr">fr</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "end" }}>
            <button
              onClick={fetchTournament}
              disabled={loadingTournament || !courtId}
              style={{ padding: "10px 14px", width: "100%" }}
            >
              {loadingTournament ? "Loading…" : "Fetch matches"}
            </button>
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Court name (from tournament)
            <select
              value={settings.tournamentCourtName ?? ""}
              onChange={(e) => setSettings({ ...settings, tournamentCourtName: e.target.value })}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            >
              <option value="">— select court —</option>
              {tournamentCourts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            Pin NOW match (optional)
            <select
              value={settings.pinnedNowMatchId ?? ""}
              onChange={(e) => setSettings({ ...settings, pinnedNowMatchId: e.target.value })}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            >
              <option value="">(auto)</option>
              {courtMatches.map((m) => (
                <option key={m.Id} value={String(m.Id)}>
                  {matchLabel(m)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Pin NEXT match (optional)
            <select
              value={settings.pinnedNextMatchId ?? ""}
              onChange={(e) => setSettings({ ...settings, pinnedNextMatchId: e.target.value })}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            >
              <option value="">(auto)</option>
              {courtMatches.map((m) => (
                <option key={m.Id} value={String(m.Id)}>
                  {matchLabel(m)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "end" }}>
            <button
              onClick={() => save()}
              disabled={saving || !courtId}
              style={{ padding: "10px 14px", width: "100%" }}
            >
              {saving ? "Saving..." : "Save tournament setup"}
            </button>
          </label>
        </div>

        <div style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>
          Tip: once saved, your `/api/rankedin/court/{courtId}/data` will include a <b>program</b> object
          with <b>nowOnCourt</b>, <b>nextOnCourt</b>, and <b>schedule</b>.
        </div>
      </div>

      {/* Overlay look & behavior (existing) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          View mode
          <select
            value={settings.viewMode ?? "auto"}
            onChange={(e) => setSettings({ ...settings, viewMode: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          >
            <option value="auto">Auto (scoreboard if live, slate if not)</option>
            <option value="scoreboard">Force scoreboard</option>
            <option value="slate">Force slate</option>
            <option value="hidden">Hide everything</option>
          </select>
        </label>

        <label>
          Tournament name
          <input
            value={settings.tournamentName ?? ""}
            onChange={(e) => setSettings({ ...settings, tournamentName: e.target.value })}
            placeholder="e.g. Squasher.hr Open 2026"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          Subtitle (optional)
          <input
            value={settings.subtitle ?? ""}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
            placeholder="e.g. Court A • Zagreb"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <input
            type="checkbox"
            checked={!!settings.swap}
            onChange={(e) => setSettings({ ...settings, swap: e.target.checked })}
          />
          Swap players
        </label>

        <label>
          Name override (left)
          <input
            value={settings.name1 ?? ""}
            onChange={(e) => setSettings({ ...settings, name1: e.target.value })}
            placeholder="Optional"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Name override (right)
          <input
            value={settings.name2 ?? ""}
            onChange={(e) => setSettings({ ...settings, name2: e.target.value })}
            placeholder="Optional"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Left color
          <input
            value={settings.leftColor ?? ""}
            onChange={(e) => setSettings({ ...settings, leftColor: e.target.value })}
            placeholder="#0b3aa6"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Right color
          <input
            value={settings.rightColor ?? ""}
            onChange={(e) => setSettings({ ...settings, rightColor: e.target.value })}
            placeholder="#c66a08"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Logo opacity
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={settings.logoOpacity ?? 0.7}
            onChange={(e) => setSettings({ ...settings, logoOpacity: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Logo scale
          <input
            type="number"
            step="0.05"
            min="0.4"
            max="2"
            value={settings.logoScale ?? 0.9}
            onChange={(e) => setSettings({ ...settings, logoScale: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => save()} disabled={saving || !courtId} style={{ padding: "10px 14px" }}>
          {saving ? "Saving..." : "Save"}
        </button>

        <button onClick={() => trigger("flash")} disabled={!courtId} style={{ padding: "10px 14px" }}>
          Flash score
        </button>

        <button onClick={() => trigger("slide")} disabled={!courtId} style={{ padding: "10px 14px" }}>
          Slide in
        </button>

        {courtId && (
          <>
            <a href={dataUrl} target="_blank" rel="noreferrer" style={{ padding: "10px 14px" }}>
              View data JSON
            </a>
            <a
              href={`/rankedin/court/${courtId}/scoreboard?refresh=1000&scale=1`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "10px 14px" }}
            >
              Open scoreboard overlay
            </a>
            <a
              href={`/rankedin/court/${courtId}/now?refresh=1000&scale=1`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "10px 14px" }}
            >
              Open “Now on court”
            </a>
            <a
              href={`/rankedin/court/${courtId}/next?refresh=1000&scale=1`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "10px 14px" }}
            >
              Open “Next on court”
            </a>
            <a
              href={`/rankedin/court/${courtId}/schedule?refresh=1000&scale=1`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "10px 14px" }}
            >
              Open “Schedule”
            </a>
          </>
        )}
      </div>
    </div>
  );
}
