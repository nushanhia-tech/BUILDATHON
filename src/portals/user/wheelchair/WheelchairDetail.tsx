import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { directionsLink, phoneDigits, waLink } from "../../../lib/geo";
import { formatKm, haversineKm } from "../../../lib/haversine";
import { fmtDate } from "../../../lib/time";
import { useRealtime } from "../../../hooks/useRealtime";
import { errMsg, useToast } from "../../../hooks/useToast";
import { Badge, ChipGroup, Field, PageHeader, Sheet, Spinner } from "../../../components/ui/Bits";
import { BigButton } from "../../../components/ui/BigButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MapView, STATUS_COLOR } from "../../../components/map/MapView";
import { useMyPosition } from "./Wheelchair";
import type { ContactReveal, ReqReason, WheelchairPublic, WheelchairRequest } from "../../../lib/types";
import { REASONS, TYPE_ICON, reqReason, reqStatus, wcCond, wcDur, wcOffer, wcStatus, wcType } from "./wcLabels";
import { Icon } from "../../../components/ui/Icon";

export default function WheelchairDetail({ seekerId: seekerOverride }: { seekerId?: string } = {}) {
  const { id: paramId } = useParams();
  const id = paramId!;
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const me = useMyPosition();
  const seekerId = seekerOverride ?? profile!.id;
  const [w, setW] = useState<WheelchairPublic | null | undefined>(undefined);
  const [req, setReq] = useState<WheelchairRequest | null>(null);
  const [contact, setContact] = useState<ContactReveal | null>(null);
  const [showReq, setShowReq] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<ReqReason>("elderly");
  const [days, setDays] = useState("14");
  const [message, setMessage] = useState("");
  const [reportText, setReportText] = useState("");
  const [confirmReq, setConfirmReq] = useState(false);
  const [photo, setPhoto] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase.from("wheelchairs_public").select("*").eq("id", id).maybeSingle();
    setW((data as WheelchairPublic) ?? null);
    const { data: rs } = await supabase.from("wheelchair_requests").select("*").eq("wheelchair_id", id).eq("seeker_id", seekerId).order("created_at", { ascending: false }).limit(1);
    const r = ((rs ?? [])[0] as WheelchairRequest) ?? null;
    setReq(r);
    if (r && (r.status === "accepted" || r.status === "returned")) {
      const { data: c } = await supabase.rpc("get_request_contact", { req: r.id });
      setContact(((c ?? []) as ContactReveal[])[0] ?? null);
    } else setContact(null);
  }, [id, seekerId]);
  useEffect(() => { void load(); }, [load]);
  useRealtime("wheelchair_requests", () => void load(), { filter: `wheelchair_id=eq.${id}` });

  if (w === undefined) return <Spinner />;
  if (w === null) return <div><PageHeader title={t("wcTitle")} back="/app/wheelchair" /><p className="card p-5">{t("empty")}</p></div>;

  const accepted = req?.status === "accepted" && contact;
  const dest = accepted && contact?.lat != null ? { lat: contact.lat!, lng: contact.lng! } : { lat: w.public_lat, lng: w.public_lng };
  const km = me ? haversineKm(me.lat, me.lng, w.public_lat, w.public_lng) : null;
  const isOwner = w.owner_id === profile!.id;
  const canRequest = !isOwner && (!req || ["declined", "returned", "cancelled"].includes(req.status)) && w.status !== "in_use";

  const sendRequest = async () => {
    setConfirmReq(false);
    try {
      const { error } = await supabase.from("wheelchair_requests").insert({ wheelchair_id: w.id, seeker_id: seekerId, reason, days_needed: Number(days) || 7, message: message || null });
      if (error) throw error;
      setShowReq(false); toast(t("requestSent"), "success"); void load();
    } catch (e) { toast(errMsg(e), "error"); }
  };
  const cancelRequest = async () => {
    const { error } = await supabase.from("wheelchair_requests").update({ status: "cancelled" }).eq("id", req!.id);
    if (error) toast(error.message, "error"); else void load();
  };
  const sendReport = async () => {
    const { error } = await supabase.from("reports").insert({ item_type: "wheelchair", item_id: w.id, reporter_id: profile!.id, reason: reportText || "—" });
    setShowReport(false);
    if (error) toast(error.message, "error"); else toast(t("reported"), "success");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`${wcType(t, w.type)}`} help={`${wcOffer(t, w.offer)} · ${w.place_name ?? ""}`} back="/app/wheelchair" />
      {w.is_demo && <p className="card p-3 text-warn font-semibold"><Icon name="sparkle" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("demoListing")}</p>}
      {w.photo_urls.length > 0 ? (
        <div className="flex flex-col gap-2">
          <img src={w.photo_urls[photo]} alt={wcType(t, w.type)} className="w-full aspect-[4/3] object-cover rounded-3xl" />
          {w.photo_urls.length > 1 && (
            <div className="flex gap-2">{w.photo_urls.map((p, i) => (
              <button key={p} type="button" onClick={() => setPhoto(i)} aria-label={`${t("photo")} ${i + 1}`} className={`rounded-2xl overflow-hidden border-4 ${i === photo ? "border-primary" : "border-transparent"}`}>
                <img src={p} alt="" className="w-20 h-16 object-cover" />
              </button>))}
            </div>
          )}
        </div>
      ) : <div className="w-full aspect-[4/3] rounded-3xl bg-soft grid place-items-center text-[8rem]" aria-hidden="true"><Icon name="wheelchair" size={96} className="text-primary" /></div>}

      <div className="card p-4 grid grid-cols-2 gap-3">
        <div><p className="text-sm text-muted">{t("status")}</p><p className="font-bold">{wcStatus(t, w.status)}</p></div>
        <div><p className="text-sm text-muted">{t("condition")}</p><p className="font-bold">{wcCond(t, w.condition)}</p></div>
        <div><p className="text-sm text-muted">{t("offer")}</p><p className="font-bold">{wcOffer(t, w.offer)}{w.offer === "rent" && w.rent_per_day ? ` · ${t("perDay", { n: w.rent_per_day })}` : ""}</p></div>
        <div><p className="text-sm text-muted">{t("duration")}</p><p className="font-bold">{wcDur(t, w.duration)}</p></div>
        <div><p className="text-sm text-muted">{t("owner")}</p><p className="font-bold">{w.owner_name} {w.owner_verified && <Badge tone="success">{t("verified")}</Badge>}</p></div>
        <div><p className="text-sm text-muted">{t("location")}</p><p className="font-bold">{km != null ? t("kmAway", { km: formatKm(km) }) : w.place_name}</p></div>
        <div className="col-span-2"><p className="font-semibold">{w.delivery ? `🚚 ${t("delivery")}` : `🏠 ${t("noDelivery")}`}</p></div>
      </div>

      {req && (
        <div className="card p-4 flex flex-col gap-2 border-l-8 border-primary">
          <p className="font-bold">{t("myRequest")}: {reqStatus(t, req.status)}</p>
          <p className="text-muted">{reqReason(t, req.reason)} · {req.days_needed} 📅</p>
          {req.return_date && req.status === "accepted" && <p className="text-warn font-semibold">{t("returnBy", { date: fmtDate(req.return_date, lang) })}</p>}
          {req.status === "pending" && <BigButton variant="surface" label={t("cancelRequest")} onClick={cancelRequest} />}
        </div>
      )}

      <MapView center={dest} zoom={accepted ? 16 : 14} me={me} height={240} ariaLabel={t("location")}
        points={[{ id: w.id, lat: dest.lat, lng: dest.lng, color: STATUS_COLOR[w.status], label: accepted ? t("exactLocation") : t("approxLocation") }]} />
      <p className="text-sm text-muted">{accepted ? `📍 ${t("exactLocation")}` : `🔒 ${t("approxLocation")}`}</p>

      <div className="flex flex-col gap-3">
        {canRequest && <BigButton label={t("iNeedIt")} onClick={() => setShowReq(true)} />}
        {accepted && contact?.phone ? (
          <div className="grid grid-cols-2 gap-3">
            <BigButton variant="success" label={`${t("call")} ${contact.phone}`} href={`tel:${phoneDigits(contact.phone)}`} />
            {contact.whatsapp && <BigButton variant="soft" label={t("whatsapp")} href={waLink(contact.phone, t("waPrefill"))} />}
          </div>
        ) : !isOwner && <p className="card p-3 text-muted"><Icon name="phone" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("phoneAfterAccept")}</p>}
        <BigButton variant="surface" label={t("directions")} href={directionsLink(dest.lat, dest.lng)} />
        {!isOwner && <BigButton variant="surface" label={t("report")} onClick={() => setShowReport(true)} />}
      </div>

      <Sheet open={showReq} title={t("iNeedIt")} onClose={() => setShowReq(false)}>
        <div className="flex flex-col gap-4">
          <ChipGroup label={t("requestReason")} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: reqReason(t, r) }))} />
          <Field label={t("daysNeeded")}><input type="number" min={1} max={365} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
          <Field label={`${t("message")} ${t("optional")}`}><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
          <BigButton label={t("sendRequest")} onClick={() => setConfirmReq(true)} />
        </div>
      </Sheet>
      <Sheet open={showReport} title={t("report")} onClose={() => setShowReport(false)}>
        <div className="flex flex-col gap-4">
          <Field label={t("reportReason")}><textarea rows={3} value={reportText} onChange={(e) => setReportText(e.target.value)} /></Field>
          <BigButton variant="danger" label={t("report")} onClick={sendReport} />
        </div>
      </Sheet>
      <ConfirmDialog open={confirmReq} body={t("sendRequest") + "?"} onOk={sendRequest} onCancel={() => setConfirmReq(false)} />
    </div>
  );
}
