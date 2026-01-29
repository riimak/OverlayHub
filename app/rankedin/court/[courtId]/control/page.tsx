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
    jerseyColor1: "#1e3a8a", // Left player jersey color
    jerseyColor2: "#b91c1c", // Right player jersey color
    logoOpacity: 0.7,
    logoScale: 0.9,
    tournamentName: "",
    tournamentDate: "",
    tournamentVenue: "",
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
    setStatus("Loading tournament data…");

    try {
      // Fetch matches, courts, and metadata in parallel
      const [matchesRes, courtsRes, metadataRes] = await Promise.all([
        fetch(`/api/rankedin/tournament/${encodeURIComponent(tournamentId)}/matches?lang=${encodeURIComponent(lang)}&readonly=true`, {
          cache: "no-store"
        }),
        fetch(`https://api.rankedin.com/v1/tournament/GetCourtsAsync?tournamentId=${encodeURIComponent(tournamentId)}`, {
          cache: "no-store"
        }).catch(() => null),
        fetch(`https://api.rankedin.com/v1/metadata/GetFeatureMetadataAsync?feature=Tournament&id=${encodeURIComponent(tournamentId)}&rankedinId=${encodeURIComponent(tournamentId)}&language=${encodeURIComponent(lang)}`, {
          cache: "no-store"
        }).catch(() => null)
      ]);

      if (!matchesRes.ok) {
        setStatus(`Failed to load tournament (HTTP ${matchesRes.status}).`);
        return;
      }

      const data = await matchesRes.json();
      const matches: TournamentMatch[] = Array.isArray(data?.Matches) ? data.Matches : [];

      // Collect courts from both matches and courts API
      const courtSet = new Set<string>();
      
      // Add courts from matches
      matches.forEach((m) => {
        const court = String(m?.Court ?? "").trim();
        if (court) courtSet.add(court);
      });

      // Parse courts data once and reuse it later
      let courtsData: any[] = [];
      if (courtsRes && courtsRes.ok) {
        courtsData = await courtsRes.json();
        if (Array.isArray(courtsData)) {
          courtsData.forEach((court: any) => {
            const courtName = String(court?.CourtName ?? "").trim();
            if (courtName) courtSet.add(courtName);
          });
        } else {
          courtsData = [];
        }
      }

      const courts = Array.from(courtSet).sort((a, b) => a.localeCompare(b));

      setTournamentMatches(matches);
      setTournamentCourts(courts);

      // Extract tournament metadata from all sources
      const tournamentInfo: any = {};
      
      // Get metadata if available
      let metadata: any = null;
      if (metadataRes && metadataRes.ok) {
        metadata = await metadataRes.json();
      }

      // Tournament Name - prioritize metadata API
      if (metadata?.name) {
        tournamentInfo.tournamentName = String(metadata.name);
      } else if (data?.Name) {
        tournamentInfo.tournamentName = String(data.Name);
      }

      // Tournament Date - extract from description or use StartDate/EndDate
      if (metadata?.featureDescription) {
        // Try to extract date from description (format: "... - 31/01/2026 12:00 - ...")
        const dateMatch = metadata.featureDescription.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          const [day, month, year] = dateMatch[1].split('/');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          tournamentInfo.tournamentDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      }
      
      // Fallback to StartDate/EndDate if no date from description
      if (!tournamentInfo.tournamentDate && (data?.StartDate || data?.EndDate)) {
        const start = data.StartDate ? new Date(data.StartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
        const end = data.EndDate ? new Date(data.EndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
        if (start && end && start !== end) {
          tournamentInfo.tournamentDate = `${start} - ${end}`;
        } else if (start) {
          tournamentInfo.tournamentDate = start;
        }
      }

      // Tournament Venue - use courts data if available
      if (courtsData.length > 0) {
        const firstCourt = courtsData[0];
        
        // Use LocationName as primary venue source
        if (firstCourt?.LocationName) {
          tournamentInfo.tournamentVenue = String(firstCourt.LocationName);
        } else if (firstCourt?.City) {
          tournamentInfo.tournamentVenue = String(firstCourt.City);
        }

        // If we don't have a subtitle and there's a court name, suggest it
        if (!settings.subtitle && firstCourt?.CourtName && courts.length === 1) {
          tournamentInfo.subtitle = String(firstCourt.CourtName);
        }
      }

      // Fallback venue extraction from metadata description
      if (!tournamentInfo.tournamentVenue && metadata?.featureDescription) {
        const locationMatch = metadata.featureDescription.match(/Location name:\s*([^-]+)/);
        if (locationMatch) {
          tournamentInfo.tournamentVenue = locationMatch[1].trim();
        }
      }

      // Final fallback to matches API for venue
      if (!tournamentInfo.tournamentVenue) {
        if (data?.VenueName) {
          tournamentInfo.tournamentVenue = String(data.VenueName);
        } else if (data?.City && data?.Country) {
          tournamentInfo.tournamentVenue = `${data.City}, ${data.Country}`;
        } else if (data?.City) {
          tournamentInfo.tournamentVenue = String(data.City);
        }
      }

      // Update settings with tournament info if found
      if (Object.keys(tournamentInfo).length > 0) {
        setSettings((prev: any) => ({ ...prev, ...tournamentInfo }));
      }

      setStatus(`Loaded tournament: ${matches.length} matches, ${courts.length} court(s).`);
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

        {/* Loaded Matches Display */}
        {tournamentMatches.length > 0 && (
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
              justifyContent: "space-between",
              marginBottom: 20
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  📋
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                    Loaded Matches
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                    {tournamentMatches.length} match{tournamentMatches.length !== 1 ? 'es' : ''} loaded from tournament
                  </p>
                </div>
              </div>
              <div style={{
                background: "rgba(79, 172, 254, 0.15)",
                border: "2px solid #4facfe",
                color: "#4facfe",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700
              }}>
                {tournamentCourts.length} court{tournamentCourts.length !== 1 ? 's' : ''}
              </div>
            </div>

            {settings.tournamentCourtName && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  background: "rgba(172, 239, 52, 0.1)",
                  border: "1px solid rgba(172, 239, 52, 0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#ACEF34",
                  fontWeight: 600
                }}>
                  🎯 Filtered to court: <strong>{settings.tournamentCourtName}</strong> ({courtMatches.length} match{courtMatches.length !== 1 ? 'es' : ''})
                </div>
              </div>
            )}

            <div style={{ 
              maxHeight: 500,
              overflowY: "auto",
              border: "1px solid rgba(100, 116, 139, 0.3)",
              borderRadius: 8,
              background: "rgba(15, 23, 42, 0.5)"
            }}>
              <table style={{ 
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13
              }}>
                <thead>
                  <tr style={{ 
                    background: "rgba(15, 23, 42, 0.8)",
                    borderBottom: "2px solid rgba(100, 116, 139, 0.3)",
                    position: "sticky",
                    top: 0
                  }}>
                    <th style={{ 
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#cbd5e1",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>ID</th>
                    <th style={{ 
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#cbd5e1",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Date/Time</th>
                    <th style={{ 
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#cbd5e1",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Court</th>
                    <th style={{ 
                      padding: "12px 16px",
                      textAlign: "left",
                      color: "#cbd5e1",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Players</th>
                    <th style={{ 
                      padding: "12px 16px",
                      textAlign: "center",
                      color: "#cbd5e1",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.tournamentCourtName ? courtMatches : tournamentMatches).map((match, idx) => {
                    const challenger = match?.Challenger?.Name || "TBD";
                    const challenged = match?.Challenged?.Name || "TBD";
                    const matchDate = match?.Date ? new Date(match.Date).toLocaleString() : "—";
                    const court = match?.Court || "—";
                    const state = match?.State;
                    
                    let statusLabel = "Scheduled";
                    let statusColor = "#94a3b8";
                    let statusBg = "rgba(148, 163, 184, 0.1)";
                    
                    if (state === 2) {
                      statusLabel = "Live";
                      statusColor = "#EF4444";
                      statusBg = "rgba(239, 68, 68, 0.15)";
                    } else if (state === 3) {
                      statusLabel = "Completed";
                      statusColor = "#10b981";
                      statusBg = "rgba(16, 185, 129, 0.15)";
                    }

                    return (
                      <tr key={match?.Id || idx} style={{ 
                        borderBottom: "1px solid rgba(100, 116, 139, 0.2)",
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(100, 116, 139, 0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ 
                          padding: "14px 16px",
                          color: "#7DC1FF",
                          fontWeight: 600
                        }}>#{match?.Id || "—"}</td>
                        <td style={{ 
                          padding: "14px 16px",
                          color: "#e2e8f0",
                          fontSize: 12
                        }}>{matchDate}</td>
                        <td style={{ 
                          padding: "14px 16px",
                          color: "#ACEF34",
                          fontWeight: 600
                        }}>{court}</td>
                        <td style={{ 
                          padding: "14px 16px",
                          color: "#f1f5f9",
                          fontWeight: 600
                        }}>
                          {challenger} <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs</span> {challenged}
                        </td>
                        <td style={{ 
                          padding: "14px 16px",
                          textAlign: "center"
                        }}>
                          <span style={{
                            background: statusBg,
                            color: statusColor,
                            padding: "4px 10px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px"
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!settings.tournamentCourtName && tournamentCourts.length > 1 && (
              <div style={{
                marginTop: 14,
                padding: 12,
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#fbbf24",
                lineHeight: 1.5
              }}>
                💡 <strong>Tip:</strong> Select a specific court above to filter this list and enable match pinning.
              </div>
            )}
          </div>
        )}

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
                � Left Player Jersey
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.jerseyColor1 ?? "#1e3a8a"}
                  onChange={(e) => setSettings({ ...settings, jerseyColor1: e.target.value })}
                  style={{ 
                    width: 50,
                    height: 42,
                    border: "2px solid rgba(100, 116, 139, 0.3)",
                    borderRadius: 8,
                    outline: "none",
                    cursor: "pointer",
                    background: "transparent"
                  }}
                />
                <input
                  type="text"
                  value={settings.jerseyColor1 ?? "#1e3a8a"}
                  onChange={(e) => setSettings({ ...settings, jerseyColor1: e.target.value })}
                  placeholder="#1e3a8a"
                  style={{ 
                    flex: 1,
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
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                👕 Right Player Jersey
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.jerseyColor2 ?? "#b91c1c"}
                  onChange={(e) => setSettings({ ...settings, jerseyColor2: e.target.value })}
                  style={{ 
                    width: 50,
                    height: 42,
                    border: "2px solid rgba(100, 116, 139, 0.3)",
                    borderRadius: 8,
                    outline: "none",
                    cursor: "pointer",
                    background: "transparent"
                  }}
                />
                <input
                  type="text"
                  value={settings.jerseyColor2 ?? "#b91c1c"}
                  onChange={(e) => setSettings({ ...settings, jerseyColor2: e.target.value })}
                  placeholder="#b91c1c"
                  style={{ 
                    flex: 1,
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
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
                �💫 Logo Opacity
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


            </>
          )}
        </div>
      </div>
    </div>

  );
}

