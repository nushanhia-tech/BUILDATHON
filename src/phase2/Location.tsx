import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useRealtime } from "../hooks/useRealtime";
import { useToast } from "../hooks/useToast";
import { PageHeader, Field, Toggle } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { useRows } from "./shared";
interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  active: boolean;
}
export function useLocationConsent(uid: string) {
  const [consent, setConsent] = useState({
    enabled: false,
    share_with_family: false,
    outside: false,
  });
  useEffect(() => {
    void supabase
      .from("location_sharing")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle()
      .then((r) => {
        if (r.data) setConsent(r.data);
      });
  }, [uid]);
  useRealtime(
    "location_sharing",
    (p) => {
      if (p.eventType !== "DELETE") setConsent(p.new as typeof consent);
    },
    { filter: `user_id=eq.${uid}` },
  );
  return { consent, setConsent };
}
function ClickZone({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}
const marker = L.divIcon({
  html: '<span style="font-size:28px">📍</span>',
  className: "",
  iconSize: [30, 35],
});
export default function Location({
  userId,
  canEdit = true,
}: {
  userId?: string;
  canEdit?: boolean;
}) {
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast(),
    uid = userId || profile!.id;
  const { consent, setConsent } = useLocationConsent(uid);
  const { rows: zones, reload } = useRows<Zone>("safe_zones", uid);
  const { rows: pings, error } = useRows<{
    id: string;
    lat: number;
    lng: number;
    created_at: string;
  }>("location_pings", uid);
  const [zone, setZone] = useState<Partial<Zone>>({
    name: "",
    lat: 10.81,
    lng: 76.19,
    radius_m: 300,
    active: true,
  });
  const saveConsent = async (
    enabled: boolean,
    share = consent.share_with_family,
  ) => {
    const r = await supabase
      .from("location_sharing")
      .upsert({
        user_id: uid,
        enabled,
        share_with_family: share,
        updated_at: new Date().toISOString(),
      });
    if (r.error) toast(r.error.message, "error");
    else setConsent({ ...consent, enabled, share_with_family: share });
  };
  const last = pings[0];
  const center: [number, number] = last
    ? [last.lat, last.lng]
    : [zone.lat || 10.81, zone.lng || 76.19];
  return (
    <div className="grid gap-4">
      <PageHeader title={t("locationTitle")} icon="📍" />
      <p className="card p-4">{t("locationLimit")}</p>
      {!userId && (
        <div className="card p-4">
          <p>{t("locationConsent")}</p>
          <Toggle
            label={t("locationEnabled")}
            checked={consent.enabled}
            onChange={(v) => void saveConsent(v)}
          />
          <Toggle
            label={t("locationViewFamily")}
            checked={consent.share_with_family}
            onChange={(v) => void saveConsent(consent.enabled, v)}
          />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {!last && <p>{t("locationNone")}</p>}
      {last && (
        <p>
          {t("locationLast")}: {new Date(last.created_at).toLocaleString()}
        </p>
      )}
      <MapContainer
        key={uid}
        center={center}
        zoom={14}
        style={{ height: 350, width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {canEdit && (
          <ClickZone onClick={(lat, lng) => setZone({ ...zone, lat, lng })} />
        )}
        {last && <Marker position={[last.lat, last.lng]} icon={marker} />}
        {zones.map((z) => (
          <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radius_m} />
        ))}
        {pings.length > 1 && (
          <Polyline
            positions={pings
              .filter(
                (p) =>
                  new Date(p.created_at).toDateString() ===
                  new Date().toDateString(),
              )
              .map((p) => [p.lat, p.lng] as [number, number])}
          />
        )}
        <Circle
          center={[zone.lat || 10.81, zone.lng || 76.19]}
          radius={zone.radius_m || 300}
          pathOptions={{ dashArray: "5", color: "#9254ca" }}
        />
      </MapContainer>
      {canEdit && consent.enabled && (
        <section className="card p-4 grid gap-3">
          <Field label={t("zoneName")}>
            <input
              value={zone.name || ""}
              onChange={(e) => setZone({ ...zone, name: e.target.value })}
            />
          </Field>
          <Field label={`${t("zoneRadius")}: ${zone.radius_m}`}>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={zone.radius_m}
              onChange={(e) =>
                setZone({ ...zone, radius_m: Number(e.target.value) })
              }
            />
          </Field>
          <BigButton
            variant="soft"
            label={t("useGps")}
            onClick={() =>
              navigator.geolocation.getCurrentPosition(
                (p) =>
                  setZone({
                    ...zone,
                    lat: p.coords.latitude,
                    lng: p.coords.longitude,
                  }),
                (e) => toast(e.message, "error"),
              )
            }
          />
          <BigButton
            label={t("save")}
            onClick={async () => {
              if (!zone.name?.trim()) return;
              const r = await supabase
                .from("safe_zones")
                .upsert({ ...zone, user_id: uid });
              if (r.error) toast(r.error.message, "error");
              else {
                setZone({ ...zone, id: undefined, name: "" });
                void reload();
              }
            }}
          />
          {zones.map((z) => (
            <div key={z.id} className="flex gap-2 flex-wrap">
              <button
                className="min-h-12 bg-soft px-3 rounded-xl"
                onClick={() => setZone(z)}
              >
                {z.name} · {z.radius_m}m ✏️
              </button>
              <button
                className="min-h-12 text-danger"
                onClick={async () => {
                  const r = await supabase
                    .from("safe_zones")
                    .delete()
                    .eq("id", z.id);
                  if (r.error) toast(r.error.message, "error");
                  else void reload();
                }}
              >
                {t("delete")}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
