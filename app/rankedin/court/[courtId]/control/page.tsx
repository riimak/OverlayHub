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
    pinnedNextMatchId: "",

    // Active display view
    activeDisplay: "scoreboard" // scoreboard, now, next, schedule
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
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "24px"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          borderRadius: 16,
          padding: "24px 32px",
          marginBottom: 24,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(100, 116, 139, 0.3)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ 
                fontSize: 32, 
                margin: 0,
                marginBottom: 8,
                fontWeight: 800,
                background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                Overlay Control
              </h1>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 12,
                fontSize: 15,
                color: "#94a3b8"
              }}>
                <span>Court:</span>
                <span style={{ 
                  background: courtId ? "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)" : "#ef4444",
                  color: courtId ? "#0f172a" : "white",
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14
                }}>
                  {courtId || "NOT SET"}
                </span>
              </div>
            </div>

            {status && (
              <div style={{
                background: status.includes("failed") || status.includes("Failed") ? "rgba(239, 68, 68, 0.15)" : "rgba(172, 239, 52, 0.15)",
                border: `2px solid ${status.includes("failed") || status.includes("Failed") ? "#ef4444" : "#ACEF34"}`,
                color: status.includes("failed") || status.includes("Failed") ? "#fca5a5" : "#ACEF34",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600
              }}>
                {status}
              </div>
            )}
          </div>

          {!courtId && (
            <div style={{ 
              marginTop: 16,
              background: "rgba(239, 68, 68, 0.15)",
              border: "2px solid #ef4444",
              color: "#fca5a5",
              padding: "12px 16px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14
            }}>
              ⚠️ Could not read courtId from URL. Open this page as /rankedin/court/&lt;courtId&gt;/control
            </div>
          )}
        </div>

        {/* Tournament Programming Section */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 24,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(100, 116, 139, 0.3)"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            marginBottom: 20
          }}>
            <div style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              🏆
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                Tournament Programming
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                Connect to RankedIn tournament data (optional)
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Tournament ID
              </span>
              <input
                value={settings.tournamentId ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentId: e.target.value })}
                placeholder="e.g. 61922"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Language
              </span>
              <select
                value={settings.tournamentLang ?? "en"}
                onChange={(e) => setSettings({ ...settings, tournamentLang: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(15, 23, 42, 0.5)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#f1f5f9"
                }}
              >
                <option value="en">English</option>
                <option value="hr">Croatian</option>
                <option value="de">German</option>
                <option value="fr">French</option>
              </select>
            </label>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                onClick={fetchTournament}
                disabled={loadingTournament || !courtId}
                style={{ 
                  padding: "11px 20px",
                  width: "100%",
                  background: loadingTournament || !courtId ? "#e2e8f0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loadingTournament || !courtId ? "not-allowed" : "pointer",
                  transition: "transform 0.1s, box-shadow 0.2s",
                  boxShadow: loadingTournament || !courtId ? "none" : "0 4px 6px rgba(102, 126, 234, 0.3)"
                }}
                onMouseDown={(e) => !loadingTournament && courtId && (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {loadingTournament ? "⏳ Loading..." : "🔄 Fetch Matches"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Court Name (from tournament)
              </span>
              <select
                value={settings.tournamentCourtName ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentCourtName: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(15, 23, 42, 0.5)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#f1f5f9"
                }}
              >
                <option value="">— select court —</option>
                {tournamentCourts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 16 }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                📍 Pin NOW Match (optional)
              </span>
              <select
                value={settings.pinnedNowMatchId ?? ""}
                onChange={(e) => setSettings({ ...settings, pinnedNowMatchId: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(15, 23, 42, 0.5)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#f1f5f9"
                }}
              >
                <option value="">(auto)</option>
                {courtMatches.map((m) => (
                  <option key={m.Id} value={String(m.Id)}>
                    {matchLabel(m)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                ⏭️ Pin NEXT Match (optional)
              </span>
              <select
                value={settings.pinnedNextMatchId ?? ""}
                onChange={(e) => setSettings({ ...settings, pinnedNextMatchId: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(15, 23, 42, 0.5)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#f1f5f9"
                }}
              >
                <option value="">(auto)</option>
                {courtMatches.map((m) => (
                  <option key={m.Id} value={String(m.Id)}>
                    {matchLabel(m)}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                onClick={() => save()}
                disabled={saving || !courtId}
                style={{ 
                  padding: "11px 20px",
                  width: "100%",
                  background: saving || !courtId ? "#e2e8f0" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving || !courtId ? "not-allowed" : "pointer",
                  transition: "transform 0.1s, box-shadow 0.2s",
                  boxShadow: saving || !courtId ? "none" : "0 4px 6px rgba(16, 185, 129, 0.3)"
                }}
                onMouseDown={(e) => !saving && courtId && (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {saving ? "💾 Saving..." : "💾 Save Tournament Setup"}
              </button>
            </div>
          </div>

          <div style={{ 
            marginTop: 20,
            padding: 14,
            background: "rgba(15, 23, 42, 0.5)",
            borderRadius: 8,
            fontSize: 13,
            color: "#94a3b8",
            lineHeight: 1.6,
            border: "1px solid rgba(100, 116, 139, 0.3)"
          }}>
            <strong style={{ color: "#cbd5e1" }}>💡 Tip:</strong> After saving, your data API will include <code style={{ 
              background: "rgba(100, 116, 139, 0.3)",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12,
              color: "#ACEF34"
            }}>program</code> object with <code style={{ 
              background: "rgba(100, 116, 139, 0.3)",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12,
              color: "#ACEF34"
            }}>nowOnCourt</code>, <code style={{ 
              background: "rgba(100, 116, 139, 0.3)",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12,
              color: "#ACEF34"
            }}>nextOnCourt</code>, and <code style={{ 
              background: "rgba(100, 116, 139, 0.3)",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12,
              color: "#ACEF34"
            }}>schedule</code>.
          </div>
        </div>

        {/* Display Settings Section */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 24,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(100, 116, 139, 0.3)"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            marginBottom: 20
          }}>
            <div style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              🎨
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                Display Settings
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                Customize overlay appearance and behavior
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                View Mode
              </span>
              <select
                value={settings.viewMode ?? "auto"}
                onChange={(e) => setSettings({ ...settings, viewMode: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(15, 23, 42, 0.5)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#f1f5f9"
                }}
              >
                <option value="auto">🤖 Auto (scoreboard if live)</option>
                <option value="scoreboard">📊 Force scoreboard</option>
                <option value="slate">📋 Force slate</option>
                <option value="hidden">🚫 Hide everything</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Tournament Name
              </span>
              <input
                value={settings.tournamentName ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentName: e.target.value })}
                placeholder="e.g. SQUASHer ChristMASAkr 2025"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Tournament Date
              </span>
              <input
                value={settings.tournamentDate ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentDate: e.target.value })}
                placeholder="e.g. January 18-20, 2026"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Tournament Venue
              </span>
              <input
                value={settings.tournamentVenue ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentVenue: e.target.value })}
                placeholder="e.g. Sports Arena Zagreb"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                Subtitle (optional)
              </span>
              <input
                value={settings.subtitle ?? ""}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                placeholder="e.g. Court Ajnc"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 10,
              padding: "12px 16px",
              background: "rgba(15, 23, 42, 0.5)",
              borderRadius: 8,
              cursor: "pointer",
              userSelect: "none",
              border: "1px solid rgba(100, 116, 139, 0.3)"
            }}>
              <input
                type="checkbox"
                checked={!!settings.swap}
                onChange={(e) => setSettings({ ...settings, swap: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>
                🔄 Swap Players (Left ↔ Right)
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                👤 Name Override (Left)
              </span>
              <input
                value={settings.name1 ?? ""}
                onChange={(e) => setSettings({ ...settings, name1: e.target.value })}
                placeholder="Optional"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                👤 Name Override (Right)
              </span>
              <input
                value={settings.name2 ?? ""}
                onChange={(e) => setSettings({ ...settings, name2: e.target.value })}
                placeholder="Optional"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                🎨 Left Player Color
              </span>
              <input
                value={settings.leftColor ?? ""}
                onChange={(e) => setSettings({ ...settings, leftColor: e.target.value })}
                placeholder="#0b3aa6"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                🎨 Right Player Color
              </span>
              <input
                value={settings.rightColor ?? ""}
                onChange={(e) => setSettings({ ...settings, rightColor: e.target.value })}
                placeholder="#c66a08"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                💫 Logo Opacity
              </span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.logoOpacity ?? 0.7}
                onChange={(e) => setSettings({ ...settings, logoOpacity: Number(e.target.value) })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                📏 Logo Scale
              </span>
              <input
                type="number"
                step="0.05"
                min="0.4"
                max="2"
                value={settings.logoScale ?? 0.9}
                onChange={(e) => setSettings({ ...settings, logoScale: Number(e.target.value) })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  background: "rgba(15, 23, 42, 0.5)",
                  color: "#f1f5f9"
                }}
                onFocus={(e) => e.target.style.borderColor = "#ACEF34"}
                onBlur={(e) => e.target.style.borderColor = "rgba(100, 116, 139, 0.3)"}
              />
            </label>
          </div>
        </div>

        {/* Actions & Quick Links Section */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          borderRadius: 16,
          padding: "28px 32px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(100, 116, 139, 0.3)"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            marginBottom: 20
          }}>
            <div style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              ⚡
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                Actions & Quick Links
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                Save settings and trigger animations
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <button 
              onClick={() => save()} 
              disabled={saving || !courtId} 
              style={{ 
                padding: "14px 20px",
                background: saving || !courtId ? "#e2e8f0" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: saving || !courtId ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: saving || !courtId ? "none" : "0 4px 6px rgba(16, 185, 129, 0.3)"
              }}
              onMouseEnter={(e) => !saving && courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              onMouseDown={(e) => !saving && courtId && (e.currentTarget.style.transform = "translateY(0)")}
            >
              {saving ? "💾 Saving..." : "💾 Save Settings"}
            </button>

            <button 
              onClick={() => trigger("flash")} 
              disabled={!courtId} 
              style={{ 
                padding: "14px 20px",
                background: !courtId ? "#e2e8f0" : "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: !courtId ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: !courtId ? "none" : "0 4px 6px rgba(139, 92, 246, 0.3)"
              }}
              onMouseEnter={(e) => courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              onMouseDown={(e) => courtId && (e.currentTarget.style.transform = "translateY(0)")}
            >
              ⚡ Flash Score
            </button>

            <button 
              onClick={() => trigger("slide")} 
              disabled={!courtId} 
              style={{ 
                padding: "14px 20px",
                background: !courtId ? "#e2e8f0" : "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: !courtId ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: !courtId ? "none" : "0 4px 6px rgba(245, 158, 11, 0.3)"
              }}
              onMouseEnter={(e) => courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              onMouseDown={(e) => courtId && (e.currentTarget.style.transform = "translateY(0)")}
            >
              🎬 Slide In
            </button>

            {courtId && (
              <a 
                href={dataUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  padding: "14px 20px",
                  background: "#64748b",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 6px rgba(100, 116, 139, 0.3)",
                  textAlign: "center",
                  textDecoration: "none",
                  display: "block"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                📊 View Data JSON
              </a>
            )}
          </div>

          {courtId && (
            <>
              <div style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)",
                margin: "24px 0"
              }} />

              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                color: "#f1f5f9",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                🎬 Remote Display Control (SSE)
              </h3>

              <p style={{
                fontSize: 13,
                color: "#94a3b8",
                marginBottom: 16,
                lineHeight: 1.6
              }}>
                Open the <strong>Unified Display</strong> below, then use these buttons to remotely switch what it shows in real-time.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
                <button
                  onClick={() => {
                    const next = { ...settings, activeDisplay: "welcome" };
                    setSettings(next);
                    save(next);
                  }}
                  disabled={saving}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "welcome"
                      ? "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)"
                      : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    color: settings.activeDisplay === "welcome" ? "#0f172a" : "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "welcome"
                      ? "0 4px 6px rgba(172, 239, 52, 0.3)"
                      : "0 2px 4px rgba(148, 163, 184, 0.2)",
                    opacity: saving ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  👋 Welcome
                </button>

                <button
                  onClick={() => {
                    const next = { ...settings, activeDisplay: "scoreboard" };
                    setSettings(next);
                    save(next);
                  }}
                  disabled={saving}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "scoreboard" 
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "scoreboard"
                      ? "0 4px 6px rgba(102, 126, 234, 0.3)"
                      : "0 2px 4px rgba(148, 163, 184, 0.2)",
                    opacity: saving ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📊 Scoreboard
                </button>

                <button
                  onClick={() => {
                    const next = { ...settings, activeDisplay: "now" };
                    setSettings(next);
                    save(next);
                  }}
                  disabled={saving}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "now"
                      ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                      : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "now"
                      ? "0 4px 6px rgba(240, 147, 251, 0.3)"
                      : "0 2px 4px rgba(148, 163, 184, 0.2)",
                    opacity: saving ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  🎯 Now on Court
                </button>

                <button
                  onClick={() => {
                    const next = { ...settings, activeDisplay: "next" };
                    setSettings(next);
                    save(next);
                  }}
                  disabled={saving}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "next"
                      ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                      : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "next"
                      ? "0 4px 6px rgba(79, 172, 254, 0.3)"
                      : "0 2px 4px rgba(148, 163, 184, 0.2)",
                    opacity: saving ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  ⏭️ Next Match
                </button>

                <button
                  onClick={() => {
                    const next = { ...settings, activeDisplay: "schedule" };
                    setSettings(next);
                    save(next);
                  }}
                  disabled={saving}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "schedule"
                      ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                      : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "schedule"
                      ? "0 4px 6px rgba(250, 112, 154, 0.3)"
                      : "0 2px 4px rgba(148, 163, 184, 0.2)",
                    opacity: saving ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📅 Schedule
                </button>

                <button
                  onClick={() => {
                    const next = { ...settings, activeDisplay: "results" };
                    setSettings(next);
                    save(next);
                  }}
                  disabled={saving}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "results"
                      ? "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)"
                      : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    color: settings.activeDisplay === "results" ? "#0f172a" : "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "results"
                      ? "0 4px 6px rgba(172, 239, 52, 0.3)"
                      : "0 2px 4px rgba(148, 163, 184, 0.2)",
                    opacity: saving ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  🏆 Results
                </button>
              </div>

              <div style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "2px dashed rgba(100, 116, 139, 0.3)",
                borderRadius: 10,
                padding: "16px",
                fontSize: 13,
                color: "#94a3b8",
                lineHeight: 1.6
              }}>
                <strong style={{ color: "#cbd5e1" }}>💡 How it works:</strong> The unified display uses Server-Sent Events (SSE) for instant updates. Click any button above to switch views remotely without page refresh. Open the unified display in a separate window or OBS browser source.
              </div>

              <div style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)",
                margin: "24px 0"
              }} />

              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                color: "#f1f5f9",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                🖥️ Open Overlay Views
              </h3>

              <p style={{
                fontSize: 13,
                color: "#94a3b8",
                marginBottom: 12,
                lineHeight: 1.6
              }}>
                Click to open each overlay in a new window. Use these for OBS browser sources or display screens.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                <a
                  href={`/rankedin/court/${courtId}/display?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "18px 18px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 6px 10px rgba(102, 126, 234, 0.4)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>🎬</div>
                  <div>Unified Display</div>
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>Real-time remote control</div>
                </a>

                <a
                  href={`/rankedin/court/${courtId}/welcome?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "16px 18px",
                    background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
                    color: "#0f172a",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(172, 239, 52, 0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  👋 Welcome
                </a>

                <a
                  href={`/rankedin/court/${courtId}/scoreboard?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "16px 18px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(102, 126, 234, 0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📊 Scoreboard
                </a>

                <a
                  href={`/rankedin/court/${courtId}/now?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "16px 18px",
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(240, 147, 251, 0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  🎯 Now on Court
                </a>

                <a
                  href={`/rankedin/court/${courtId}/next?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "16px 18px",
                    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(79, 172, 254, 0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  ⏭️ Next Match
                </a>

                <a
                  href={`/rankedin/court/${courtId}/schedule?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "16px 18px",
                    background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(250, 112, 154, 0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📅 Schedule
                </a>

                <a
                  href={`/rankedin/court/${courtId}/results?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "16px 18px",
                    background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
                    color: "#0f172a",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(172, 239, 52, 0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  🏆 Results
                </a>
              </div>

              <div style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)",
                margin: "24px 0"
              }} />

              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                color: "#f1f5f9",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                🔗 Open Overlay Pages
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <a
                  href={`/rankedin/court/${courtId}/display?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "14px 18px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 6px 10px rgba(102, 126, 234, 0.4)",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>🎬</div>
                  <div>Unified Display</div>
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>Controlled by buttons above</div>
                </a>

                <a
                  href={`/rankedin/court/${courtId}/scoreboard?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(102, 126, 234, 0.3)",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                    opacity: 0.85
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📊 Scoreboard
                </a>

                <a
                  href={`/rankedin/court/${courtId}/now?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(240, 147, 251, 0.3)",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                    opacity: 0.85
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  🎯 Now on Court
                </a>

                <a
                  href={`/rankedin/court/${courtId}/next?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(79, 172, 254, 0.3)",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                    opacity: 0.85
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  ⏭️ Next Match
                </a>

                <a
                  href={`/rankedin/court/${courtId}/schedule?refresh=1000&scale=1`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(250, 112, 154, 0.3)",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                    opacity: 0.85
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📅 Schedule
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

  );
}

