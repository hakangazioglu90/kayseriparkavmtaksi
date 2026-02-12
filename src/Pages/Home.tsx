// src/pages/Home.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchTR, GeoPick } from "../api/geocode";

function PickBox(props: { label: string; value: GeoPick | null; onPick: (p: GeoPick) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<GeoPick[]>([]);
  const [busy, setBusy] = useState(false);

  const showLabel = useMemo(() => (props.value ? props.value.label : ""), [props.value]);

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{props.label}</div>
      <input
        placeholder={showLabel || "Type address/city..."}
        value={q}
        onChange={async (e) => {
          const v = e.target.value;
          setQ(v);
          if (v.trim().length < 3) return setItems([]);
          setBusy(true);
          try { setItems(await searchTR(v)); } finally { setBusy(false); }
        }}
      />
      {busy ? <div style={{ fontSize: 12 }}>Searching…</div> : null}
      {items.length ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
          {items.map((it) => (
            <div
              key={`${it.lat}-${it.lng}-${it.label}`}
              style={{ padding: 6, cursor: "pointer" }}
              onClick={() => { props.onPick(it); setQ(""); setItems([]); }}
            >
              {it.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const nav = useNavigate();
  const [from, setFrom] = useState<GeoPick | null>(null);
  const [to, setTo] = useState<GeoPick | null>(null);
  const [date, setDate] = useState<string>("");

  return (
    <div style={{ padding: 16, maxWidth: 820 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <PickBox label="From" value={from} onPick={setFrom} />
        <PickBox label="To" value={to} onPick={setTo} />
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Date</div>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <button
          disabled={!from || !to || !date}
          onClick={() => nav("/results", { state: { from, to, date } })}
        >
          Search
        </button>
      </div>
    </div>
  );
}
