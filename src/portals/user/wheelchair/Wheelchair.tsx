import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import { useUserSettings } from "../../../hooks/useUserSettings";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { PATTAMBI, getPosition } from "../../../lib/geo";
import { formatKm, haversineKm } from "../../../lib/haversine";
import { fmtDate } from "../../../lib/time";
import { useRealtime } from "../../../hooks/useRealtime";
import { errMsg, useToast } from "../../../hooks/useToast";
import { Badge, Empty, PageHeader, Section, Spinner, Tabs } from "../../../components/ui/Bits";
import { BigButton } from "../../../components/ui/BigButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MapView, STATUS_COLOR } from "../../../components/map/MapView";
import { GiveForm } from "./GiveForm";
import type { ContactReveal, PublicProfile, Wheelchair as Wc, WheelchairPublic, WheelchairRequest, WcOffer, WcType } from "../../../lib/types";
import { TYPE_ICON, WC_OFFERS, WC_TYPES, reqReason, reqStatus, wcOffer, wcStatus, wcType } from "./wcLabels";
import { phoneDigits, waLink } from "../../../lib/geo";
import { Icon } from "../../../components/ui/Icon";

type Tab = "find" | "give" | "mine";

export default function WheelchairPage() {
  const { t } = useI18n();
  const { features } = useUserSettings();
  const [params, setParams] = useSearchParams();
  const feats = features("wheelchair").map((f) => f.key);
  const tabs = [
    ...(feats.includes("find") ? [{ key: "find" as Tab, label: t("tabFind") }] : []),
    ...(feats.includes("give") ? [{ key: "give" as Tab, label: t("tabGive") }] : []),
    { key: "mine" as Tab, label: t("tabMine") },
  ];
  const tab = (tabs.find((x) => x.key === params.get("tab"))?.key ?? tabs[0].key) as Tab;
  const setTab = (k: Tab) => setParams({ tab: k }, { replace: true });
  return (
    <div>
      <PageHeader title={t("wcTitle")} help={t("wcHelp")} icon="♿" />
      <Tabs items={tabs} value={tab} onChange={setTab} />
      {tab === "find" && <FindTab />}
      {tab === "give" && <GiveTab onDone={() => setTab("mine")} />}
      {tab === "mine" && <MineTab />}
    </div>
  );
}

export function useMyPosition() {
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => { void getPosition().then(setMe); }, []);
  return me;
}

function FindTab() {
  const { t } = useI18n();
  const nav = useNavigate();
  const me = useMyPosition();
  const [rows, setRows] = useState<WheelchairPublic[] | null>(null);
  const [view, setView] = useState<"map" | "list">("list");
  const [type, setType] = useState<WcType | "">("");
  const [offer, setOffer] = useState<WcOffer | "">("");
  const [dist, setDist] = useState<number>(0);
  const origin = me ?? PATTAMBI;

  const load = useCallback(async () => {
    const { data } = await supabase.from("wheelchairs_public").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as WheelchairPublic[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtime("wheelchair_requests", () => void load());

  const list = useMemo(() => (rows ?? [])
    .map((w) => ({ w, km: haversineKm(origin.lat, origin.lng, w.public_lat, w.public_lng) }))
    .filter(({ w, km }) => (!type || w.type === type) && (!offer || w.offer === offer) && (!dist || km <= dist))
    .sort((a, b) => a.km - b.km), [rows, origin.lat, origin.lng, type, offer, dist]);

  if (!rows) return <Spinner />;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <BigButton variant={view === "list" ? "primary" : "surface"} label={t("listView")} onClick={() => setView("list")} pressed={view === "list"} />
        <BigButton variant={view === "map" ? "primary" : "surface"} label={t("mapView")} onClick={() => setView("map")} pressed={view === "map"} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col"><span className="text-sm font-semibold">{t("filterType")}</span>
          <select value={type} onChange={(e) => setType(e.target.value as WcType | "")}>
            <option value="">{t("all")}</option>
            {WC_TYPES.map((v) => <option key={v} value={v}>{wcType(t, v)}</option>)}
          </select>
        </label>
        <label className="flex flex-col"><span className="text-sm font-semibold">{t("filterOffer")}</span>
          <select value={offer} onChange={(e) => setOffer(e.target.value as WcOffer | "")}>
            <option value="">{t("all")}</option>
            {WC_OFFERS.map((v) => <option key={v} value={v}>{wcOffer(t, v)}</option>)}
          </select>
        </label>
        <label className="flex flex-col"><span className="text-sm font-semibold">{t("filterDistance")}</span>
          <select value={dist} onChange={(e) => setDist(Number(e.target.value))}>
            <option value={0}>{t("anyDistance")}</option>
            {[5, 10, 25].map((d) => <option key={d} value={d}>≤ {d} km</option>)}
          </select>
        </label>
      </div>
      {view === "map" ? (
        <>
          <MapView center={origin} zoom={12} me={me} ariaLabel={t("mapView")}
            points={list.map(({ w }) => ({ id: w.id, lat: w.public_lat, lng: w.public_lng, color: STATUS_COLOR[w.status], label: `${wcType(t, w.type)} · ${wcStatus(t, w.status)}`, onClick: () => nav(`/app/wheelchair/${w.id}`) }))} height={420} />
          <p className="text-sm text-muted">{t("st_available")} · {t("st_requested")} · {t("st_in_use")} · 🔵 {t("you")} — {t("approxLocation")}</p>
        </>
      ) : list.length === 0 ? <Empty text={t("noListings")} icon="♿" /> : (
        <ul className="flex flex-col gap-3">
          {list.map(({ w, km }) => (
            <li key={w.id}>
              <Link to={`/app/wheelchair/${w.id}`} className="card p-3 flex gap-3 items-center">
                {w.photo_urls[0] ? <img src={w.photo_urls[0]} alt="" className="w-24 h-24 object-cover rounded-2xl" />
                  : <span className="w-24 h-24 rounded-2xl bg-soft grid place-items-center text-5xl" aria-hidden="true"><Icon name="wheelchair" size={44} className="text-primary" /></span>}
                <span className="flex-1 min-w-0">
                  <span className="block font-bold">{wcType(t, w.type)}</span>
                  <span className="block text-base">{wcOffer(t, w.offer)}{w.offer === "rent" && w.rent_per_day ? ` · ${t("perDay", { n: w.rent_per_day })}` : ""}</span>
                  <span className="block text-base text-muted"><Icon name="pin" size={18} className="inline-block align-[-0.25em] mr-1.5" />{w.place_name} · {t("kmAway", { km: formatKm(km) })}</span>
                  <span className="flex flex-wrap gap-1 mt-1">
                    <Badge tone={w.status === "available" ? "success" : w.status === "requested" ? "warn" : "danger"}>{wcStatus(t, w.status)}</Badge>
                    {w.owner_verified && <Badge tone="success">{t("verified")}</Badge>}
                    {w.is_demo && <Badge tone="warn">{t("demo")}</Badge>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GiveTab({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth();
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[1.3rem] font-bold">{t("giveTitle")}</h2>
      {!profile?.phone && <p className="card p-3 text-warn font-semibold"><Icon name="phone" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("needPhoneProfile")}</p>}
      <GiveForm ownerId={profile!.id} onDone={onDone} />
    </div>
  );
}

type ReqRow = WheelchairRequest & { seeker?: PublicProfile; wc?: Wc; contact?: ContactReveal | null };

function MineTab() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const uid = profile!.id;
  const [mine, setMine] = useState<Wc[] | null>(null);
  const [incoming, setIncoming] = useState<ReqRow[]>([]);
  const [outgoing, setOutgoing] = useState<(WheelchairRequest & { wc?: WheelchairPublic })[]>([]);
  const [del, setDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: ws } = await supabase.from("wheelchairs").select("*").eq("owner_id", uid).order("created_at", { ascending: false });
    const myWcs = (ws ?? []) as Wc[];
    setMine(myWcs);
    if (myWcs.length) {
      const { data: rs } = await supabase.from("wheelchair_requests").select("*").in("wheelchair_id", myWcs.map((w) => w.id)).order("created_at", { ascending: false });
      const reqs = (rs ?? []) as WheelchairRequest[];
      const ids = [...new Set(reqs.map((r) => r.seeker_id))];
      const { data: ps } = ids.length ? await supabase.from("profiles_public").select("*").in("id", ids) : { data: [] };
      const withContact = await Promise.all(reqs.map(async (r) => {
        const contact = r.status === "accepted" ? ((await supabase.rpc("get_request_contact", { req: r.id })).data?.[0] as ContactReveal) ?? null : null;
        return { ...r, seeker: ((ps ?? []) as PublicProfile[]).find((p) => p.id === r.seeker_id), wc: myWcs.find((w) => w.id === r.wheelchair_id), contact };
      }));
      setIncoming(withContact);
    } else setIncoming([]);
    const { data: os } = await supabase.from("wheelchair_requests").select("*").eq("seeker_id", uid).order("created_at", { ascending: false });
    const outs = (os ?? []) as WheelchairRequest[];
    const wids = outs.map((o) => o.wheelchair_id);
    const { data: pubs } = wids.length ? await supabase.from("wheelchairs_public").select("*").in("id", wids) : { data: [] };
    setOutgoing(outs.map((o) => ({ ...o, wc: ((pubs ?? []) as WheelchairPublic[]).find((w) => w.id === o.wheelchair_id) })));
  }, [uid]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("wheelchair_requests", () => void load());

  const setStatus = async (r: ReqRow, status: "accepted" | "declined" | "returned") => {
    const patch: Record<string, unknown> = { status };
    if (status === "accepted") { const d = new Date(); d.setDate(d.getDate() + r.days_needed); patch.return_date = d.toISOString().slice(0, 10); }
    const { error } = await supabase.from("wheelchair_requests").update(patch).eq("id", r.id);
    if (error) toast(error.message, "error"); else { toast(t("saved"), "success"); void load(); }
  };
  const remove = async () => {
    try { const { error } = await supabase.from("wheelchairs").delete().eq("id", del!); if (error) throw error; void load(); }
    catch (e) { toast(errMsg(e), "error"); } finally { setDel(null); }
  };

  if (!mine) return <Spinner />;
  return (
    <div>
      <Section title={t("incomingRequests")}>
        {incoming.length === 0 ? <Empty text={t("noRequests")} icon="📭" /> : (
          <ul className="flex flex-col gap-3">
            {incoming.map((r) => (
              <li key={r.id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold flex-1">{r.wc ? `${wcType(t, r.wc.type)}` : ""}</span>
                  <Badge tone={r.status === "accepted" ? "success" : r.status === "pending" ? "warn" : "soft"}>{reqStatus(t, r.status)}</Badge>
                </div>
                <p>{t("seeker")}: <b>{r.seeker?.name}</b> · {reqReason(t, r.reason)} · {r.days_needed} 📅</p>
                {r.message && <p className="bg-soft rounded-2xl p-3"><Icon name="chat" size={18} className="inline-block align-[-0.25em] mr-1.5" />{r.message}</p>}
                {r.return_date && <p className="text-muted">{t("returnBy", { date: fmtDate(r.return_date, lang) })}</p>}
                {r.contact?.phone && (
                  <div className="grid grid-cols-2 gap-2">
                    <BigButton variant="soft" label={t("call")} href={`tel:${phoneDigits(r.contact.phone)}`} />
                    {r.contact.whatsapp && <BigButton variant="soft" label={t("whatsapp")} href={waLink(r.contact.phone, "Sa Hai")} />}
                  </div>
                )}
                {r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2">
                    <BigButton variant="surface" label={t("decline")} onClick={() => void setStatus(r, "declined")} />
                    <BigButton variant="success" label={t("accept")} onClick={() => void setStatus(r, "accepted")} />
                  </div>
                )}
                {r.status === "accepted" && <BigButton label={t("returned")} onClick={() => void setStatus(r, "returned")} />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("myListings")}>
        {mine.length === 0 ? <Empty text={t("noListings")} icon="♿" /> : (
          <ul className="flex flex-col gap-3">
            {mine.map((w) => (
              <li key={w.id} className="card p-3 flex gap-3 items-center">
                {w.photo_urls[0] ? <img src={w.photo_urls[0]} alt="" className="w-20 h-20 object-cover rounded-2xl" /> : <span className="w-20 h-20 rounded-2xl bg-soft grid place-items-center text-4xl"><Icon name="wheelchair" size={36} className="text-primary" /></span>}
                <div className="flex-1">
                  <p className="font-bold">{wcType(t, w.type)}</p>
                  <p className="text-base text-muted"><Icon name="pin" size={18} className="inline-block align-[-0.25em] mr-1.5" />{w.place_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.approved ? <Badge tone="success">{wcStatus(t, w.status)}</Badge> : <Badge tone="warn"><Icon name="hourglass" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("awaitingApproval")}</Badge>}
                    {w.is_demo && <Badge tone="warn">{t("demo")}</Badge>}
                  </div>
                </div>
                <button type="button" aria-label={t("delete")} onClick={() => setDel(w.id)} className="min-h-16 min-w-16 rounded-2xl bg-soft text-danger text-xl"><Icon name="trash" size={20} /></button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("myRequests")}>
        {outgoing.length === 0 ? <Empty text={t("noRequests")} icon="📭" /> : (
          <ul className="flex flex-col gap-3">
            {outgoing.map((r) => (
              <li key={r.id}>
                <Link to={`/app/wheelchair/${r.wheelchair_id}`} className="card p-4 flex flex-col gap-1">
                  <span className="font-bold">{r.wc ? `${wcType(t, r.wc.type)} · ${r.wc.place_name ?? ""}` : "♿"}</span>
                  <span><Badge tone={r.status === "accepted" ? "success" : r.status === "pending" ? "warn" : "soft"}>{reqStatus(t, r.status)}</Badge></span>
                  {r.return_date && r.status === "accepted" && <span className="text-warn font-semibold">{t("returnBy", { date: fmtDate(r.return_date, lang) })}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <ConfirmDialog open={Boolean(del)} danger body={t("confirmDelete")} onOk={remove} onCancel={() => setDel(null)} />
    </div>
  );
}
