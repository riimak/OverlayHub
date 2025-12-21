"use client";

import { useEffect, useMemo, useState } from "react";

export default function Control({ params }: { params: { courtId: string } }) {
  const courtId = params.courtId;

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

  const settingsUrl = useMemo(() => `/api/rankedin/court/${courtId}/settings`, [courtId]);
  const triggerUrl = useMemo(() => `/api/rankedin/court/${courtId}/trigger`, [courtId]);
  const dataUrl = useMemo(() => `/api/rankedin/court/${courtId}/data`, [courtId]);

  useEffect(() => {
    (async () => {
      const r = await fetch(settingsUrl, { cache: "no-store" });
      if (r.ok) {
        const s = await r.json();
        setSettings((prev: any) => ({ ...prev, ...s }));
      }
    })();
  }, [settingsUrl]);

  async function save() {
    setSaving(true);
    try {
      await fetch(settingsUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings)
      });
    } finally {
      setSaving(false);
    }
  }

  async function trigger(type: string) {
    await fetch(triggerUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, target: "score" })
    });
  }

  return (
    <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif", maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Overlay Control</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>Court: {courtId}</div>

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

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={save} disabled={saving} style={{ padding: "10px 14px" }}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={() => trigger("flash")} style={{ padding: "10px 14px" }}>
          Flash score
        </button>
        <button onClick={() => trigger("slide")} style={{ padding: "10px 14px" }}>
          Slide in
        </button>
        <a href={dataUrl} target="_blank" rel="noreferrer" style={{ padding: "10px 14px" }}>
          View data JSON
        </a>
      </div>
    </div>
  );
}
