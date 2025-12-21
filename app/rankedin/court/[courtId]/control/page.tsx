"use client";

import { useEffect, useMemo, useState } from "react";

function courtIdFromPathname(pathname: string) {
  // expected: /rankedin/court/<courtId>/control
  const parts = pathname.split("/").filter(Boolean);
  // ["rankedin","court","157010","control"]
  if (parts.length >= 4 && parts[0] === "rankedin" && parts[1] === "court") {
    return parts[2] || "";
  }
  return "";
}

export default function ControlPage() {
  const [courtId, setCourtId] = useState<string>("");

  // Form state
  const [settings, setSettings] = useState<any>({
    format: "bo3",
    swap: false,
    name1: "",
    name2: "",
    leftColor: "",
    rightColor: "",
    logoOpacity: 0.7,
    logoScale: 0.9
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

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

  async function save() {
    if (!settingsUrl) return;

    setSaving(true);
    setStatus("Saving…");
    try {
      const r = await fetch(settingsUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings)
      });

      if (!r.ok) {
        setStatus(`Save failed (HTTP ${r.status}).`);
        return;
      }

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

  return (
    <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif", maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Overlay Control</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          Format
          <select
            value={settings.format ?? "bo3"}
            onChange={(e) => setSettings({ ...settings, format: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          >
            <option value="bo3">Best of 3</option>
            <option value="bo5">Best of 5</option>
          </select>
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
        <button onClick={save} disabled={saving || !courtId} style={{ padding: "10px 14px" }}>
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
              Open overlay
            </a>
          </>
        )}
      </div>
    </div>
  );
}
