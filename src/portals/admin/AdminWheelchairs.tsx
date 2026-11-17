import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { fmtDate } from "../../lib/time";
import { PATTAMBI } from "../../lib/geo";
import { Badge, Section, Sheet, Spinner, Tabs, Toggle } from "../../components/ui/Bits";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { MapView, STATUS_COLOR } from "../../components/map/MapView";
import { GiveForm } from "../user/wheelchair/GiveForm";
import type { Profile, Wheelchair, WcStatus, WcType } from "../../lib/types";
import { TYPE_ICON, WC_TYPES, reqReason, reqStatus, wcCond, wcOffer, wcStatus, wcType } from "../user/wheelchair/wcLabels";

type View = "table" | "gallery" | "map";
interface HistRow { id: string; seeker_name: string; reason: string; days_needed: number; status: string; return_date: string | null; created_at: string }

export default function AdminWheelchairs() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<Wheelchair[] | null>(null);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [view, setView] = useState<View>("table");
  const [q, setQ] = useState("");
  const [type, setType] = useState<WcType | "">("");
  const [status, setStatus] = useState<WcStatus | "">("");
  const [adding, setAdding] = useState(false);
  const [reject, setReject] = useState<Wheelchair | null>(null);
  const [hist, setHist] = useState<{ w: Wheelchair; rows: HistRow[] } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("wheelchairs").select("*").order("created_at", { ascending: false });
    const ws = (data ?? []) as Wheelchair[];
    setRows(ws);
    const ids = [...new Set(ws.map((w) => w.owner_id))];
    const { data: ps } = ids.length ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
    setOwners((ps ?? []) as Profile[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const owner = (id: string) => owners.find((o) => o.id === id);

  const approve = async (w: Wheelchair) => { const { error } = await supabase.from("wheelchairs").update({ approved: true }).eq("id", w.id); if (error) toast(error.message, "error"); else void load(); };
  const doReject = async () => { const { error } = await supabase.from("wheelchairs").delete().eq("id", reject!.id); setReject(null); if (error) toast(error.message, "error"); else void load(); };
  const verify = async (p: Profile, v: boolean) => { const { error } = await supabase.from("profiles").update({ verified: v }).eq("id", p.id); if (error) toast(error.message, "error"); else void load(); };
  const showHistory = async (w: Wheelchair) => {
    const { data, error } = await supabase.rpc("admin_wheelchair_history", { wc: w.id });
    if (error) toast(error.message, "error"); else setHist({ w, rows: (data ?? []) as HistRow[] });
  };

  const filtered = useMemo(() => (rows ?? []).filter((w) => w.approved && (!type || w.type === type) && (!status || w.status === status) &&
    (!q || `${w.place_name ?? ""} ${owner(w.owner_id)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, owners, type, status, q]);

  if (!rows) return <Spinner />;
  const queue = rows.filter((w) => !w.approved);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-[1.8rem] font-bold flex-1">{t("admWheelchairs")}</h1>
        <button onClick={() => setAdding(true)} className="min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold">{t("addAsOrg")}</button>
      </div>

      <Section title={`${t("approvalQueue")} (${queue.length})`}>
        {queue.length === 0 ? <p className="text-muted">✔️</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {queue.map((w) => (
              <li key={w.id} className="card p-4 flex gap-3">
                <div className="flex gap-1">{w.photo_urls.slice(0, 2).map((p) => <img key={p} src={p} alt="" className="w-24 h-24 object-cover rounded-xl" />)}
                  {!w.photo_urls.length && <span className="w-24 h-24 rounded-xl bg-soft grid place-items-center text-4xl">{TYPE_ICON[w.type]}</span>}</div>
                <div className="flex-1 flex flex-col gap-1">
                  <p className="font-bold">{wcType(t, w.type)} {w.is_demo && <Badge tone="warn">{t("demo")}</Badge>}</p>
                  <p className="text-sm text-muted">{wcCond(t, w.condition)} · {wcOffer(t, w.offer)} · 📍 {w.place_name}</p>
                  <p className="text-sm">{t("owner")}: {owner(w.owner_id)?.name}</p>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => void approve(w)} className="min-h-10 px-4 rounded-lg bg-success text-white font-semibold">{t("approve")}</button>
                    <button onClick={() => setReject(w)} className="min-h-10 px-4 rounded-lg bg-soft text-danger font-semibold">{t("reject")}</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("allListings")}>
        <div className="flex flex-wrap gap-2 items-center">
          <Tabs big={false} items={[{ key: "table" as View, label: t("table") }, { key: "gallery" as View, label: t("gallery") }, { key: "map" as View, label: t("map") }]} value={view} onChange={setView} />
          <input className="!w-56" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔎 ${t("place")} / ${t("owner")}`} aria-label={t("search")} />
          <select className="!w-48" value={type} onChange={(e) => setType(e.target.value as WcType | "")} aria-label={t("type")}><option value="">{t("all")}</option>{WC_TYPES.map((v) => <option key={v} value={v}>{wcType(t, v)}</option>)}</select>
          <select className="!w-40" value={status} onChange={(e) => setStatus(e.target.value as WcStatus | "")} aria-label={t("status")}><option value="">{t("all")}</option>{(["available", "requested", "in_use"] as WcStatus[]).map((v) => <option key={v} value={v}>{wcStatus(t, v)}</option>)}</select>
        </div>
        {view === "table" && (
          <div className="card overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-soft"><tr><th className="p-3">{t("type")}</th><th className="p-3">{t("place")}</th><th className="p-3">{t("owner")}</th><th className="p-3">{t("offer")}</th><th className="p-3">{t("status")}</th><th className="p-3">{t("created")}</th><th className="p-3" /></tr></thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-t border-line">
                    <td className="p-3">{TYPE_ICON[w.type]} {wcType(t, w.type)} {w.is_demo && <Badge tone="warn">{t("demo")}</Badge>}</td>
                    <td className="p-3">{w.place_name}</td>
                    <td className="p-3">{owner(w.owner_id)?.name} {owner(w.owner_id)?.verified && "✔️"}</td>
                    <td className="p-3">{wcOffer(t, w.offer)}</td>
                    <td className="p-3">{wcStatus(t, w.status)}</td>
                    <td className="p-3">{fmtDate(w.created_at, lang)}</td>
                    <td className="p-3"><button onClick={() => void showHistory(w)} className="min-h-10 px-3 rounded-lg bg-soft">{t("requestHistory")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {view === "gallery" && (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filtered.map((w) => (
              <li key={w.id} className="tile p-2">
                {w.photo_urls[0] ? <img src={w.photo_urls[0]} alt="" className="w-full aspect-square object-cover rounded-xl" /> : <div className="w-full aspect-square rounded-xl bg-soft grid place-items-center text-5xl">{TYPE_ICON[w.type]}</div>}
                <p className="font-semibold mt-1">{wcType(t, w.type)}</p><p className="text-sm text-muted">{w.place_name}</p>
              </li>
            ))}
          </ul>
        )}
        {view === "map" && (
          <MapView center={PATTAMBI} zoom={11} height={480} ariaLabel={t("map")}
            points={filtered.map((w) => ({ id: w.id, lat: w.lat, lng: w.lng, color: STATUS_COLOR[w.status], label: `${wcType(t, w.type)} · ${w.place_name ?? ""}` }))} />
        )}
      </Section>

      <Section title={t("verifyOrgs")}>
        <ul className="card divide-y divide-line max-w-2xl">
          {owners.map((o) => (
            <li key={o.id} className="p-3 flex items-center gap-3">
              <span className="flex-1">{o.name} <span className="text-muted text-sm">· {rows.filter((w) => w.owner_id === o.id).length} ♿</span></span>
              <Toggle label={o.verified ? t("verified") : t("verify")} checked={o.verified} onChange={(v) => void verify(o, v)} />
            </li>
          ))}
        </ul>
      </Section>

      <Sheet open={adding} title={t("addAsOrg")} onClose={() => setAdding(false)}>
        <GiveForm ownerId={profile!.id} asAdmin onDone={() => { setAdding(false); void load(); }} />
      </Sheet>
      <Sheet open={Boolean(hist)} title={`${t("requestHistory")} — ${hist ? wcType(t, hist.w.type) : ""}`} onClose={() => setHist(null)}>
        {hist && (hist.rows.length === 0 ? <p className="text-muted">{t("noRequests")}</p> : (
          <ul className="divide-y divide-line">{hist.rows.map((r) => (
            <li key={r.id} className="py-2">{r.seeker_name} · {reqReason(t, r.reason as never)} · {r.days_needed}d · {reqStatus(t, r.status)} · {fmtDate(r.created_at, lang)}</li>
          ))}</ul>
        ))}
      </Sheet>
      <ConfirmDialog open={Boolean(reject)} danger body={`${t("reject")}?`} onOk={doReject} onCancel={() => setReject(null)} />
    </div>
  );
}
