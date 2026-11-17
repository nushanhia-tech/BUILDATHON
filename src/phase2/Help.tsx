import CoordinatesMap from "./CoordinatesMap";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { PageHeader, Field, Toggle, Sheet } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { VoiceInput } from "../components/ui/VoiceInput";
import { useRows, VoiceClip, PrivateAudio } from "./shared";
import { haversineKm } from "../lib/haversine";
export const SKILLS = [
  "shopping",
  "hospital_escort",
  "medicine_pickup",
  "form_filling",
  "tech_help",
  "reading",
  "companionship",
  "home_repair",
  "transport",
  "wheelchair_delivery",
  "other",
] as const;
export interface HelpRow {
  id: string;
  title: string;
  description: string;
  category: string;
  preferred_time: string;
  public_lat: number;
  public_lng: number;
  lat: number;
  lng: number;
  status: string;
  urgency: string;
  volunteer_id: string;
  requester_id: string;
  requested_for_user_id?: string;
  voice_url: string;
  created_at: string;
}
export interface VolunteerRow {
  user_id: string;
  skills: string[];
  area_name: string;
  lat: number;
  lng: number;
  radius_km: number;
  available: boolean;
  institution: string;
  verified: boolean;
  total_hours: number;
}
export default function Help({
  userId,
  canEdit = true,
  volunteer = false,
}: {
  userId?: string;
  canEdit?: boolean;
  volunteer?: boolean;
}) {
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast(),
    { id } = useParams();
  const { rows, reload, error } = useRows<HelpRow>("help_requests");
  const [nearby, setNearby] = useState<HelpRow[]>([]),
    [vp, setVp] = useState<VolunteerRow | null>(null),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState({
      category: "shopping",
      title: "",
      description: "",
      voice_url: "",
      preferred_time: "",
      lat: 10.81,
      lng: 76.19,
      place_name: "",
      urgency: "normal",
      notify_family: true,
    }),
    [confirming, setConfirming] = useState(false);
  const loadNearby = () => {
    void supabase
      .from("help_requests_public")
      .select("*")
      .then((r) => {
        if (r.error) toast(r.error.message, "error");
        else setNearby(r.data || []);
      });
    void supabase
      .from("volunteer_profiles")
      .select("*")
      .eq("user_id", profile!.id)
      .maybeSingle()
      .then((r) => setVp(r.data));
  };
  useEffect(() => {
    if (volunteer) loadNearby();
  }, [volunteer]);
  const list = id
    ? rows.filter((r) => r.id === id)
    : userId
      ? rows.filter(
          (r) =>
            (r as HelpRow & { requested_for_user_id: string })
              .requested_for_user_id === userId,
        )
      : rows.filter((r) =>
          volunteer
            ? r.volunteer_id === profile!.id
            : r.requester_id === profile!.id ||
              r.requested_for_user_id === profile!.id,
        );
  return (
    <div className="grid gap-4">
      <PageHeader title={t("helpTitle")} icon="🙋" />
      <p className="card p-4 font-semibold">{t("freeService")}</p>
      {error && <p role="alert">{error}</p>}
      {!volunteer && canEdit && (
        <BigButton label={t("askHelp")} onClick={() => setOpen(true)} />
      )}
      {volunteer && (
        <>
          <p>{t("verificationNeeded")}</p>
          <Link className="text-primary min-h-12" to="/volunteer/profile">
            {t("profile")} →
          </Link>
          <h2 className="text-xl font-bold">{t("nearbyRequests")}</h2>
          <CoordinatesMap
            points={nearby
              .filter(
                (r) =>
                  vp?.skills.includes(r.category) &&
                  haversineKm(vp.lat, vp.lng, r.public_lat, r.public_lng) <=
                    vp.radius_km,
              )
              .map((r) => ({
                lat: r.public_lat,
                lng: r.public_lng,
                label: r.title,
              }))}
          />
          {vp &&
            nearby
              .filter(
                (r) =>
                  vp.available &&
                  vp.skills.includes(r.category) &&
                  haversineKm(vp.lat, vp.lng, r.public_lat, r.public_lng) <=
                    vp.radius_km,
              )
              .sort(
                (a, b) =>
                  (a.urgency === "soon" ? -1 : 0) -
                    (b.urgency === "soon" ? -1 : 0) ||
                  haversineKm(vp.lat, vp.lng, a.public_lat, a.public_lng) -
                    haversineKm(vp.lat, vp.lng, b.public_lat, b.public_lng),
              )
              .map((r) => (
                <article key={r.id} className="card p-4 grid gap-2">
                  <h3 className="font-bold">{r.title}</h3>
                  <p>{r.description}</p>
                  <p>
                    {t(r.category as never)} ·{" "}
                    {haversineKm(
                      vp.lat,
                      vp.lng,
                      r.public_lat,
                      r.public_lng,
                    ).toFixed(1)}{" "}
                    km ·{" "}
                    {r.urgency === "soon"
                      ? t("soonUrgency")
                      : t("normalUrgency")}
                  </p>
                  <a
                    className="text-primary"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${r.public_lat},${r.public_lng}`}
                  >
                    {t("openMap")}
                  </a>
                  <BigButton
                    label={t("acceptHelp")}
                    onClick={async () => {
                      const result = await supabase.rpc("accept_help", {
                        request_id: r.id,
                      });
                      if (result.error) toast(result.error.message, "error");
                      else {
                        loadNearby();
                        void reload();
                      }
                    }}
                  />
                </article>
              ))}
        </>
      )}
      <h2 className="text-xl font-bold">{t("myRequests")}</h2>
      {list.map((r) => (
        <HelpDetail
          key={r.id}
          row={r}
          volunteer={volunteer}
          onChanged={() => void reload()}
        />
      ))}
      {open && (
        <Sheet
          open
          title={t("askHelp")}
          onClose={() => {
            setOpen(false);
            setConfirming(false);
          }}
        >
          <div className="grid gap-3">
            {confirming ? (
              <>
                <h2 className="font-bold">{draft.title}</h2>
                <p>{draft.description}</p>
                <p>
                  {t(draft.category as never)} · {draft.place_name}
                </p>
                <BigButton
                  label={t("confirmItem")}
                  onClick={async () => {
                    const r = await supabase.from("help_requests").insert({
                      ...draft,
                      preferred_time: draft.preferred_time
                        ? new Date(draft.preferred_time).toISOString()
                        : null,
                      requested_for_user_id: userId || null,
                    });
                    if (r.error) toast(r.error.message, "error");
                    else {
                      setOpen(false);
                      setConfirming(false);
                      void reload();
                    }
                  }}
                />
                <BigButton
                  variant="soft"
                  label={t("back")}
                  onClick={() => setConfirming(false)}
                />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((k) => (
                    <button
                      className={`min-h-16 rounded-2xl p-2 ${draft.category === k ? "bg-primary text-on-primary" : "bg-soft"}`}
                      key={k}
                      onClick={() => setDraft({ ...draft, category: k })}
                    >
                      {t(k === "other" ? "other_help" : k)}
                    </button>
                  ))}
                </div>
                <Field label={t("name")}>
                  <input
                    required
                    maxLength={120}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </Field>
                <Field label={t("requestDescription")}>
                  <textarea
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </Field>
                <VoiceInput
                  onSubmit={(v) => setDraft({ ...draft, description: v })}
                />
                <VoiceClip
                  value={draft.voice_url}
                  onChange={(v) => setDraft({ ...draft, voice_url: v })}
                />
                <Field label={t("preferredTime")}>
                  <input
                    type="datetime-local"
                    value={draft.preferred_time}
                    onChange={(e) =>
                      setDraft({ ...draft, preferred_time: e.target.value })
                    }
                  />
                </Field>
                <Field label={t("areaName")}>
                  <input
                    value={draft.place_name}
                    onChange={(e) =>
                      setDraft({ ...draft, place_name: e.target.value })
                    }
                  />
                </Field>
                <LocationFields
                  lat={draft.lat}
                  lng={draft.lng}
                  onChange={(lat, lng) => setDraft({ ...draft, lat, lng })}
                />
                <Toggle
                  label={t("soonUrgency")}
                  checked={draft.urgency === "soon"}
                  onChange={(v) =>
                    setDraft({ ...draft, urgency: v ? "soon" : "normal" })
                  }
                />
                <Toggle
                  label={t("notifyFamily")}
                  checked={draft.notify_family}
                  onChange={(v) => setDraft({ ...draft, notify_family: v })}
                />
                <BigButton
                  label={t("next")}
                  onClick={() => {
                    if (draft.title.trim()) setConfirming(true);
                  }}
                />
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
export function LocationFields({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const { t } = useI18n(),
    toast = useToast();
  return (
    <div className="grid gap-2">
      <CoordinatesMap
        points={[{ lat, lng, label: t("useGps") }]}
        onPick={onChange}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("latitude")}>
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={lat}
            onChange={(e) => onChange(Number(e.target.value), lng)}
          />
        </Field>
        <Field label={t("longitude")}>
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={lng}
            onChange={(e) => onChange(lat, Number(e.target.value))}
          />
        </Field>
      </div>
      <BigButton
        variant="soft"
        label={t("useGps")}
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            (p) => onChange(p.coords.latitude, p.coords.longitude),
            (e) => toast(e.message, "error"),
          )
        }
      />
    </div>
  );
}
function HelpDetail({
  row: r,
  volunteer,
  onChanged,
}: {
  row: HelpRow;
  volunteer: boolean;
  onChanged: () => void;
}) {
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast();
  const [contact, setContact] = useState<{
      name: string;
      phone: string;
      verified: boolean;
      avatar_url: string;
    } | null>(null),
    [hours, setHours] = useState("1"),
    [rating, setRating] = useState(5),
    [thanks, setThanks] = useState(""),
    [voice, setVoice] = useState("");
  useEffect(() => {
    if (r.volunteer_id)
      void supabase
        .rpc("help_contact", { request_id: r.id })
        .then((v) => setContact(v.data));
  }, [r.id, r.volunteer_id]);
  const transition = async (status: string) => {
    const v = await supabase.rpc("transition_help", {
      request_id: r.id,
      next_status: status,
      hours: Number(hours),
    });
    if (v.error) toast(v.error.message, "error");
    else onChanged();
  };
  return (
    <article className="card p-4 grid gap-3">
      <h3 className="text-xl font-bold">{r.title}</h3>
      <p>{t(`status_${r.status}` as never)}</p>
      <p>{r.description}</p>
      {r.voice_url && <PrivateAudio path={r.voice_url} />}
      {contact && (
        <div className="card p-3">
          {contact.avatar_url && (
            <img
              src={contact.avatar_url}
              alt={contact.name}
              className="w-20 h-20 rounded-full"
            />
          )}
          <p>
            {contact.name} {contact.verified ? "✓" : ""}
          </p>
          <BigButton label={t("call")} href={`tel:${contact.phone}`} />
        </div>
      )}
      {volunteer && r.volunteer_id === profile!.id && (
        <>
          <a
            className="text-primary"
            href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            {t("openMap")}
          </a>
          {r.status === "accepted" && (
            <BigButton
              label={t("onTheWay")}
              onClick={() => void transition("in_progress")}
            />
          )}
          {r.status === "in_progress" && (
            <>
              <Field label={t("hoursSpent")}>
                <input
                  type="number"
                  min="0.1"
                  max={24}
                  step="0.1"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </Field>
              <BigButton
                label={t("completeHelp")}
                onClick={() => void transition("completed")}
              />
            </>
          )}
        </>
      )}
      {!volunteer &&
        r.status === "completed" &&
        r.requester_id === profile!.id && (
          <details>
            <summary>{t("thanks")}</summary>
            <Field label={t("rating")}>
              <input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </Field>
            <VoiceInput onSubmit={setThanks} />
            <Field label={t("thanks")}>
              <textarea
                value={thanks}
                onChange={(e) => setThanks(e.target.value)}
              />
            </Field>
            <VoiceClip value={voice} onChange={setVoice} />
            <BigButton
              label={t("send")}
              onClick={async () => {
                const result = await supabase.from("help_feedback").insert({
                  request_id: r.id,
                  rating,
                  thanks_message: thanks,
                  voice_url: voice,
                });
                toast(
                  result.error?.message || t("saved"),
                  result.error ? "error" : "success",
                );
              }}
            />
          </details>
        )}
      {!volunteer && ["open", "accepted"].includes(r.status) && (
        <BigButton
          variant="soft"
          label={t("cancel")}
          onClick={() => void transition("cancelled")}
        />
      )}
      <ReportButton type="help_request" id={r.id} />
    </article>
  );
}
export function ReportButton({ type, id }: { type: string; id: string }) {
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast();
  return (
    <button
      className="text-danger min-h-12"
      onClick={async () => {
        const reason = prompt(t("reportReason"));
        if (!reason) return;
        const r = await supabase.from("reports").insert({
          item_type: type,
          item_id: id,
          reporter_id: profile!.id,
          reason,
        });
        toast(r.error?.message || t("saved"), r.error ? "error" : "success");
      }}
    >
      🚩 {t("report")}
    </button>
  );
}
export function VolunteerProfile() {
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast();
  const [v, setV] = useState<Partial<VolunteerRow>>({
    skills: [],
    lat: 10.81,
    lng: 76.19,
    radius_km: 5,
    available: true,
  });
  useEffect(() => {
    void supabase
      .from("volunteer_profiles")
      .select("*")
      .eq("user_id", profile!.id)
      .maybeSingle()
      .then((r) => {
        if (r.data) setV(r.data);
      });
  }, [profile?.id]);
  return (
    <div className="grid gap-4">
      <PageHeader title={t("volunteerTitle")} icon="🙋" />
      {(["area_name", "institution"] as const).map((k) => (
        <Field
          key={k}
          label={t(k === "area_name" ? "areaName" : "institution")}
        >
          <input
            value={v[k] || ""}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
          />
        </Field>
      ))}
      <div className="grid grid-cols-2 gap-2">
        {SKILLS.map((k) => (
          <Toggle
            key={k}
            label={t(k === "other" ? "other_help" : k)}
            checked={v.skills?.includes(k) || false}
            onChange={(on) =>
              setV({
                ...v,
                skills: on
                  ? [...(v.skills || []), k]
                  : v.skills?.filter((x) => x !== k),
              })
            }
          />
        ))}
      </div>
      <LocationFields
        lat={v.lat || 10.81}
        lng={v.lng || 76.19}
        onChange={(lat, lng) => setV({ ...v, lat, lng })}
      />
      <Field label={t("radiusKm")}>
        <input
          type="number"
          min={1}
          max={100}
          value={v.radius_km}
          onChange={(e) => setV({ ...v, radius_km: Number(e.target.value) })}
        />
      </Field>
      <Toggle
        label={t("available")}
        checked={!!v.available}
        onChange={(available) => setV({ ...v, available })}
      />
      <BigButton
        label={t("save")}
        onClick={async () => {
          const { verified, total_hours, ...safe } = v;
          void verified;
          void total_hours;
          const r = await supabase
            .from("volunteer_profiles")
            .upsert({ ...safe, user_id: profile!.id });
          toast(r.error?.message || t("saved"), r.error ? "error" : "success");
        }}
      />
    </div>
  );
}
export function Impact() {
  const { profile } = useAuth(),
    { t } = useI18n();
  const [impact, setImpact] = useState({ count: 0, hours: 0, rating: 0 });
  const { rows } = useRows<{
    id: string;
    thanks_message: string;
    rating: number;
    voice_url: string;
  }>("help_feedback");
  useEffect(() => {
    void supabase.rpc("volunteer_impact").then((r) => {
      if (r.data) setImpact(r.data);
    });
  }, []);
  return (
    <div className="grid gap-4">
      <PageHeader title={t("impact")} icon="🏅" />
      <div className="card p-6 text-3xl">
        {impact.count >= 50
          ? "🥇"
          : impact.count >= 20
            ? "🥈"
            : impact.count >= 5
              ? "🥉"
              : "♡"}{" "}
        {impact.count} · {impact.hours}h · ⭐{" "}
        {Number(impact.rating || 0).toFixed(1)}
      </div>
      {rows.map((r) => (
        <p className="card p-4" key={r.id}>
          {r.thanks_message} · ⭐ {r.rating}
          {r.voice_url && <PrivateAudio path={r.voice_url} />}
        </p>
      ))}
      <BigButton
        label={t("certificate")}
        onClick={async () => {
          const { downloadPdf } = await import("./pdf");
          const { data } = await supabase
            .from("volunteer_profiles")
            .select("institution")
            .eq("user_id", profile!.id)
            .maybeSingle();
          await downloadPdf(
            t("serviceCertificate"),
            [
              profile!.name,
              data?.institution || "",
              `${t("myRequests")}: ${impact.count}`,
              `${t("hoursSpent")}: ${impact.hours}`,
              new Date().toLocaleDateString(),
            ],
            "nila-volunteer-certificate.pdf",
          );
        }}
      />
      <p>{t("serviceCertificate")}</p>
    </div>
  );
}
