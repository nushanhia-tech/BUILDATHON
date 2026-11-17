import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { PATTAMBI, getPosition, reverseGeocode, searchPlaces, type Place } from "../../../lib/geo";
import { errMsg, useToast } from "../../../hooks/useToast";
import { PhotoUpload } from "../../../components/ui/PhotoUpload";
import { ChipGroup, Field, Toggle } from "../../../components/ui/Bits";
import { BigButton } from "../../../components/ui/BigButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MapView } from "../../../components/map/MapView";
import type { WcCondition, WcDuration, WcOffer, WcType } from "../../../lib/types";
import { TYPE_ICON, WC_CONDITIONS, WC_DURATIONS, WC_OFFERS, WC_TYPES, wcCond, wcDur, wcOffer, wcType } from "./wcLabels";

/** Listing form (user "Give" tab and admin "add as organisation"). */
export function GiveForm({ ownerId, onDone, asAdmin = false }: { ownerId: string; onDone: () => void; asAdmin?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [photos, setPhotos] = useState<string[]>([]);
  const [type, setType] = useState<WcType>("manual");
  const [condition, setCondition] = useState<WcCondition>("good");
  const [offer, setOffer] = useState<WcOffer>("free_lend");
  const [rent, setRent] = useState("");
  const [duration, setDuration] = useState<WcDuration>("1m");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounce.current);
    if (query.trim().length < 3) { setResults([]); return; }
    debounce.current = window.setTimeout(() => { searchPlaces(query).then(setResults).catch(() => setResults([])); }, 700);
  }, [query]);

  const movePin = async (lat: number, lng: number) => {
    setPos({ lat, lng });
    const n = await reverseGeocode(lat, lng);
    if (n) setPlaceName(n);
  };
  const useGps = async () => {
    const p = await getPosition();
    if (p) await movePin(p.lat, p.lng); else toast(t("needLocation"), "error");
  };

  const validate = () => {
    if (!photos.length) { toast(t("needPhoto"), "error"); return false; }
    if (!pos) { toast(t("needLocation"), "error"); return false; }
    return true;
  };

  const submit = async () => {
    setConfirm(false);
    if (!validate()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("wheelchairs").insert({
        owner_id: ownerId, photo_urls: photos, type, condition, offer, rent_per_day: offer === "rent" ? Number(rent) || 0 : null,
        duration, lat: pos!.lat, lng: pos!.lng, place_name: placeName || null, delivery, ...(asAdmin ? { approved: true } : {}),
      });
      if (error) throw error;
      toast(`${t("listingSubmitted")} ${asAdmin ? "" : t("awaitingApproval")}`, "success");
      onDone();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  if (preview) {
    return (
      <div className="flex flex-col gap-4">
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto">{photos.map((p) => <img key={p} src={p} alt="" className="w-40 h-32 object-cover rounded-2xl" />)}</div>
          <p className="text-[1.3rem] font-bold">{TYPE_ICON[type]} {wcType(t, type)}</p>
          <p>{t("condition")}: {wcCond(t, condition)} · {t("offer")}: {wcOffer(t, offer)}{offer === "rent" ? ` (${t("perDay", { n: rent || 0 })})` : ""}</p>
          <p>{t("duration")}: {wcDur(t, duration)} · {delivery ? t("delivery") : t("noDelivery")}</p>
          <p>📍 {placeName}</p>
          <p className="text-sm text-muted bg-soft rounded-2xl p-3">🔒 {t("privacyNote")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BigButton variant="surface" label={`← ${t("edit")}`} onClick={() => setPreview(false)} />
          <BigButton variant="success" label={t("submit")} disabled={busy} onClick={() => setConfirm(true)} />
        </div>
        <ConfirmDialog open={confirm} body={t("confirmListing")} onOk={submit} onCancel={() => setConfirm(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label={t("photos")}><PhotoUpload value={photos} onChange={setPhotos} max={3} folder="wheelchairs" /></Field>
      <ChipGroup label={t("type")} value={type} onChange={setType} options={WC_TYPES.map((v) => ({ value: v, label: `${TYPE_ICON[v]} ${wcType(t, v)}` }))} />
      <ChipGroup label={t("condition")} value={condition} onChange={setCondition} options={WC_CONDITIONS.map((v) => ({ value: v, label: wcCond(t, v) }))} />
      <ChipGroup label={t("offer")} value={offer} onChange={setOffer} options={WC_OFFERS.map((v) => ({ value: v, label: wcOffer(t, v) }))} />
      {offer === "rent" && <Field label={t("rentPerDay")}><input type="number" min={0} inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} /></Field>}
      <ChipGroup label={t("duration")} value={duration} onChange={setDuration} options={WC_DURATIONS.map((v) => ({ value: v, label: wcDur(t, v) }))} />

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold mb-1">{t("location")}</legend>
        <BigButton variant="soft" label={t("myLocation")} onClick={useGps} />
        <Field label={t("placeSearch")}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pattambi, Palakkad…" />
        </Field>
        {results.length > 0 && (
          <ul className="card divide-y divide-line">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button type="button" className="w-full text-left p-3 min-h-14" onClick={() => { setPos({ lat: r.lat, lng: r.lng }); setPlaceName(r.name.split(",")[0]); setResults([]); setQuery(""); }}>
                  📍 {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">{t("dragPin")}</p>
        <MapView center={pos ?? PATTAMBI} zoom={pos ? 15 : 12} pin={pos ?? PATTAMBI} onPinMove={(a, b) => void movePin(a, b)} height={300} ariaLabel={t("location")} />
        <Field label={t("placeName")}><input value={placeName} onChange={(e) => setPlaceName(e.target.value)} /></Field>
      </fieldset>
      <div className="card p-4"><Toggle label={t("delivery")} checked={delivery} onChange={setDelivery} /></div>
      <p className="text-sm text-muted bg-soft rounded-2xl p-3">🔒 {t("privacyNote")}</p>
      <BigButton label={t("preview")} onClick={() => validate() && setPreview(true)} />
    </div>
  );
}
