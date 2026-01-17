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
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "24px"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: 16,
          padding: "24px 32px",
          marginBottom: 24,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ 
                fontSize: 32, 
                margin: 0,
                marginBottom: 8,
                fontWeight: 800,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                color: "#64748b"
              }}>
                <span>Court:</span>
                <span style={{ 
                  background: courtId ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#ef4444",
                  color: "white",
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
                background: status.includes("failed") || status.includes("Failed") ? "#fef2f2" : "#f0fdf4",
                border: `2px solid ${status.includes("failed") || status.includes("Failed") ? "#fecaca" : "#bbf7d0"}`,
                color: status.includes("failed") || status.includes("Failed") ? "#991b1b" : "#166534",
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
              background: "#fef2f2",
              border: "2px solid #fecaca",
              color: "#991b1b",
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
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 24,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.1)"
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
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              🏆
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                Tournament Programming
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Connect to RankedIn tournament data (optional)
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Tournament ID
              </span>
              <input
                value={settings.tournamentId ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentId: e.target.value })}
                placeholder="e.g. 61922"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Language
              </span>
              <select
                value={settings.tournamentLang ?? "en"}
                onChange={(e) => setSettings({ ...settings, tournamentLang: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  cursor: "pointer",
                  fontFamily: "inherit"
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
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Court Name (from tournament)
              </span>
              <select
                value={settings.tournamentCourtName ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentCourtName: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  cursor: "pointer",
                  fontFamily: "inherit"
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
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                📍 Pin NOW Match (optional)
              </span>
              <select
                value={settings.pinnedNowMatchId ?? ""}
                onChange={(e) => setSettings({ ...settings, pinnedNowMatchId: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  cursor: "pointer",
                  fontFamily: "inherit"
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
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                ⏭️ Pin NEXT Match (optional)
              </span>
              <select
                value={settings.pinnedNextMatchId ?? ""}
                onChange={(e) => setSettings({ ...settings, pinnedNextMatchId: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  cursor: "pointer",
                  fontFamily: "inherit"
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
            background: "#f8fafc",
            borderRadius: 8,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.6
          }}>
            <strong style={{ color: "#475569" }}>💡 Tip:</strong> After saving, your data API will include <code style={{ 
              background: "#e2e8f0",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12
            }}>program</code> object with <code style={{ 
              background: "#e2e8f0",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12
            }}>nowOnCourt</code>, <code style={{ 
              background: "#e2e8f0",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12
            }}>nextOnCourt</code>, and <code style={{ 
              background: "#e2e8f0",
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 12
            }}>schedule</code>.
          </div>
        </div>

        {/* Display Settings Section */}
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 24,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.1)"
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
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              🎨
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                Display Settings
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Customize overlay appearance and behavior
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                View Mode
              </span>
              <select
                value={settings.viewMode ?? "auto"}
                onChange={(e) => setSettings({ ...settings, viewMode: e.target.value })}
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                <option value="auto">🤖 Auto (scoreboard if live)</option>
                <option value="scoreboard">📊 Force scoreboard</option>
                <option value="slate">📋 Force slate</option>
                <option value="hidden">🚫 Hide everything</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Tournament Name
              </span>
              <input
                value={settings.tournamentName ?? ""}
                onChange={(e) => setSettings({ ...settings, tournamentName: e.target.value })}
                placeholder="e.g. SQUASHer ChristMASAkr 2025"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Subtitle (optional)
              </span>
              <input
                value={settings.subtitle ?? ""}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                placeholder="e.g. Court Ajnc"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 10,
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 8,
              cursor: "pointer",
              userSelect: "none"
            }}>
              <input
                type="checkbox"
                checked={!!settings.swap}
                onChange={(e) => setSettings({ ...settings, swap: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
                🔄 Swap Players (Left ↔ Right)
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                👤 Name Override (Left)
              </span>
              <input
                value={settings.name1 ?? ""}
                onChange={(e) => setSettings({ ...settings, name1: e.target.value })}
                placeholder="Optional"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                👤 Name Override (Right)
              </span>
              <input
                value={settings.name2 ?? ""}
                onChange={(e) => setSettings({ ...settings, name2: e.target.value })}
                placeholder="Optional"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                🎨 Left Player Color
              </span>
              <input
                value={settings.leftColor ?? ""}
                onChange={(e) => setSettings({ ...settings, leftColor: e.target.value })}
                placeholder="#0b3aa6"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                🎨 Right Player Color
              </span>
              <input
                value={settings.rightColor ?? ""}
                onChange={(e) => setSettings({ ...settings, rightColor: e.target.value })}
                placeholder="#c66a08"
                style={{ 
                  padding: "10px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
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
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
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
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </label>
          </div>
        </div>

        {/* Actions & Quick Links Section */}
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderRadius: 16,
          padding: "28px 32px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.1)"
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
              background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20
            }}>
              ⚡
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                Actions & Quick Links
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", marginTop: 4 }}>
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
                color: "#475569",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                🖥️ Switch Display View
              </h3>

              <p style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 12,
                lineHeight: 1.6
              }}>
                Use these buttons to change what's shown on the unified display screen. Click a view below, then open the <strong>Display</strong> link.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
                <button
                  onClick={() => {
                    const newSettings = { ...settings, activeDisplay: "scoreboard" };
                    setSettings(newSettings);
                    save(newSettings);
                  }}
                  disabled={!courtId}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "scoreboard" 
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                      : "#f1f5f9",
                    color: settings.activeDisplay === "scoreboard" ? "white" : "#475569",
                    border: settings.activeDisplay === "scoreboard" ? "2px solid #667eea" : "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !courtId ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "scoreboard" ? "0 4px 6px rgba(102, 126, 234, 0.3)" : "none"
                  }}
                  onMouseEnter={(e) => courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📊 Scoreboard
                </button>

                <button
                  onClick={() => {
                    const newSettings = { ...settings, activeDisplay: "now" };
                    setSettings(newSettings);
                    save(newSettings);
                  }}
                  disabled={!courtId}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "now" 
                      ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" 
                      : "#f1f5f9",
                    color: settings.activeDisplay === "now" ? "white" : "#475569",
                    border: settings.activeDisplay === "now" ? "2px solid #f093fb" : "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !courtId ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "now" ? "0 4px 6px rgba(240, 147, 251, 0.3)" : "none"
                  }}
                  onMouseEnter={(e) => courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  🎯 Now on Court
                </button>

                <button
                  onClick={() => {
                    const newSettings = { ...settings, activeDisplay: "next" };
                    setSettings(newSettings);
                    save(newSettings);
                  }}
                  disabled={!courtId}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "next" 
                      ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" 
                      : "#f1f5f9",
                    color: settings.activeDisplay === "next" ? "white" : "#475569",
                    border: settings.activeDisplay === "next" ? "2px solid #4facfe" : "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !courtId ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "next" ? "0 4px 6px rgba(79, 172, 254, 0.3)" : "none"
                  }}
                  onMouseEnter={(e) => courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  ⏭️ Next Match
                </button>

                <button
                  onClick={() => {
                    const newSettings = { ...settings, activeDisplay: "schedule" };
                    setSettings(newSettings);
                    save(newSettings);
                  }}
                  disabled={!courtId}
                  style={{ 
                    padding: "14px 18px",
                    background: settings.activeDisplay === "schedule" 
                      ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" 
                      : "#f1f5f9",
                    color: settings.activeDisplay === "schedule" ? "white" : "#475569",
                    border: settings.activeDisplay === "schedule" ? "2px solid #fa709a" : "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !courtId ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: settings.activeDisplay === "schedule" ? "0 4px 6px rgba(250, 112, 154, 0.3)" : "none"
                  }}
                  onMouseEnter={(e) => courtId && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  📅 Schedule
                </button>
              </div>

              <div style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)",
                margin: "24px 0"
              }} />

              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                color: "#475569",
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

