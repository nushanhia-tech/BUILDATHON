import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useRealtime } from "../../hooks/useRealtime";
import { errMsg, useToast } from "../../hooks/useToast";
import {
  ModuleEditor,
  type ModuleDraft,
} from "../../components/settings/ModuleEditor";
import {
  DisplayEditor,
  type DisplayDraft,
} from "../../components/settings/DisplayEditor";
import {
  PageHeader,
  Section,
  Field,
  Toggle,
  Empty,
  Badge,
} from "../../components/ui/Bits";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { BigButton } from "../../components/ui/BigButton";
import { ActivityLogList } from "../../components/ActivityLogList";
import type {
  FamilyLink,
  LinkLevel,
  Mode,
  PublicProfile,
} from "../../lib/types";
import { Icon } from "../../components/ui/Icon";

export default function Settings() {
  const { t } = useI18n();
  const { profile, refreshProfile, signOut } = useAuth();
  const { settings, modules, subFeatures, save } = useUserSettings();
  const toast = useToast();
  const nav = useNavigate();
  const [draft, setDraft] = useState<ModuleDraft | null>(null);
  const [display, setDisplay] = useState<DisplayDraft | null>(null);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      enabled_modules: settings.enabled_modules,
      enabled_features: settings.enabled_features,
      custom_labels: settings.custom_labels ?? {},
      custom_icons: settings.custom_icons ?? {},
      module_order: settings.module_order,
    });
    setDisplay({
      text_size: settings.text_size,
      high_contrast: settings.high_contrast,
      voice_on: settings.voice_on,
      voice_rate: Number(settings.voice_rate),
      vibration: settings.vibration,
      language: settings.language,
    });
  }, [settings]);

  const doSave = async (patch: Parameters<typeof save>[0]) => {
    try {
      await save(patch);
      toast(t("saved"), "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  return (
    <div>
      <PageHeader
        title={t("settingsTitle")}
        help={t("settingsHelp")}
        icon="⚙️"
      />

      <Section title={t("myModules")}>
        {draft && (
          <ModuleEditor
            modules={modules}
            subFeatures={subFeatures}
            value={draft}
            onChange={setDraft}
          />
        )}
        <BigButton
          label={t("save")}
          icon="💾"
          onClick={() => draft && doSave(draft)}
        />
      </Section>

      <Section title={t("display")}>
        {display && <DisplayEditor value={display} onChange={setDisplay} />}
        <BigButton
          label={t("save")}
          icon="💾"
          onClick={() => display && doSave(display)}
        />
      </Section>

      <Section title={t("locationTitle")}>
        <Link to="/app/location" className="min-h-14 p-3 bg-soft rounded-2xl">
          📍 {t("configureLocation")}
        </Link>
      </Section>
      <Section title={t("volunteerTitle")}>
        <Toggle
          label={t("enableVolunteer")}
          checked={!!profile?.is_volunteer}
          onChange={async (v) => {
            const r = await supabase
              .from("profiles")
              .update({ is_volunteer: v })
              .eq("id", profile!.id);
            if (r.error) toast(r.error.message, "error");
            else await refreshProfile();
          }}
        />
        {profile?.is_volunteer && (
          <Link className="min-h-14 p-3 bg-soft rounded-2xl" to="/volunteer">
            {t("volunteerTitle")} →
          </Link>
        )}
      </Section>
      <ModesSection />
      <ProfileSection onSaved={refreshProfile} />
      <FamilyLinksSection />

      <Section title={t("activityLog")}>
        <ActivityLogList userId={profile!.id} />
      </Section>

      <div className="flex flex-col gap-3 mt-6">
        <BigButton
          variant="surface"
          label={t("rerunOnboarding")}
          onClick={async () => {
            await save({ onboarded: false });
            nav("/app/onboarding");
          }}
        />
        <BigButton
          variant="surface"
          label={t("logout")}
          icon="🚪"
          onClick={() => void signOut()}
        />
      </div>
    </div>
  );
}

function ModesSection() {
  const { t } = useI18n();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const modes: Mode[] = ["vision", "hearing", "mobility", "simple"];
  const toggle = async (m: Mode, on: boolean) => {
    const next = on
      ? [...new Set([...(profile?.modes ?? []), m])]
      : (profile?.modes ?? []).filter((x) => x !== m);
    const { error } = await supabase
      .from("profiles")
      .update({ modes: next })
      .eq("id", profile!.id);
    if (error) toast(error.message, "error");
    else await refreshProfile();
  };
  return (
    <Section title={t("myNeeds")}>
      <div className="card p-4 flex flex-col divide-y divide-line">
        {modes.map((m) => (
          <Toggle
            key={m}
            label={t(`mode_${m}` as const)}
            checked={profile?.modes.includes(m) ?? false}
            onChange={(v) => void toggle(m, v)}
          />
        ))}
      </div>
    </Section>
  );
}

function ProfileSection({ onSaved }: { onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [wa, setWa] = useState(profile?.whatsapp ?? true);
  const [avatar, setAvatar] = useState<string[]>(
    profile?.avatar_url ? [profile.avatar_url] : [],
  );
  const submit = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        whatsapp: wa,
        avatar_url: avatar[0] ?? null,
      })
      .eq("id", profile!.id);
    if (error) toast(error.message, "error");
    else {
      toast(t("saved"), "success");
      await onSaved();
    }
  };
  return (
    <Section title={t("profile")}>
      <div className="card p-4 flex flex-col gap-3">
        <PhotoUpload value={avatar} onChange={setAvatar} folder="avatar" />
        <Field label={t("name")}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("phone")}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Toggle label={t("hasWhatsapp")} checked={wa} onChange={setWa} />
        <BigButton label={t("save")} icon="💾" onClick={submit} />
      </div>
    </Section>
  );
}

function FamilyLinksSection() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const uid = profile!.id;
  const [links, setLinks] = useState<(FamilyLink & { fam?: PublicProfile })[]>(
    [],
  );
  const [code, setCode] = useState<{ code: string; at: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("family_links")
      .select("*")
      .eq("user_id", uid)
      .not("family_id", "is", null)
      .neq("status", "revoked")
      .order("created_at");
    const ls = (data ?? []) as FamilyLink[];
    const ids = ls.map((l) => l.family_id!);
    const { data: ps } = ids.length
      ? await supabase.from("profiles_public").select("*").in("id", ids)
      : { data: [] };
    setLinks(
      ls.map((l) => ({
        ...l,
        fam: ((ps ?? []) as PublicProfile[]).find((p) => p.id === l.family_id),
      })),
    );
  }, [uid]);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtime("family_links", () => void load(), {
    filter: `user_id=eq.${uid}`,
  });
  useEffect(() => {
    if (!code) return;
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [code]);

  const generate = async () => {
    const { data, error } = await supabase.rpc("create_link_code");
    if (error) toast(error.message, "error");
    else setCode({ code: data as string, at: Date.now() });
  };
  const setLevel = async (id: string, level: LinkLevel) => {
    const { error } = await supabase
      .from("family_links")
      .update({ level })
      .eq("id", id);
    if (error) toast(error.message, "error");
    else {
      toast(t("saved"), "success");
      void load();
    }
  };
  const revoke = async () => {
    const { error } = await supabase
      .from("family_links")
      .update({ status: "revoked" })
      .eq("id", revoking!);
    setRevoking(null);
    if (error) toast(error.message, "error");
    else void load();
  };
  const minsLeft = code
    ? Math.max(0, 15 - Math.floor((now - code.at) / 60000))
    : 0;

  return (
    <Section title={t("familyLinks")}>
      <p className="text-muted">{t("familyLinksHelp")}</p>
      <BigButton label={t("generateCode")} onClick={generate} />
      {code && (
        <div className="hero p-5 text-center" aria-live="polite">
          <p
            className="text-[2.6rem] font-extrabold tracking-[0.4em]"
            aria-label={code.code.split("").join(" ")}
          >
            {code.code}
          </p>
          <p>
            {minsLeft > 0
              ? t("codeValid", { min: minsLeft })
              : t("codeExpired")}
          </p>
        </div>
      )}
      <h3 className="font-bold mt-2">{t("linkedFamily")}</h3>
      {links.length === 0 ? (
        <Empty text={t("noLinks")} icon="👨‍👩‍👧" />
      ) : (
        <ul className="flex flex-col gap-3">
          {links.map((l) => (
            <li key={l.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg flex-1">
                  <Icon
                    name="user"
                    size={18}
                    className="inline-block align-[-0.25em] mr-1.5"
                  />
                  {l.fam?.name ?? "…"}
                </span>
                <Badge tone={l.status === "active" ? "success" : "warn"}>
                  {t(`status_${l.status}` as const)}
                </Badge>
              </div>
              {l.status === "active" && (
                <div
                  role="radiogroup"
                  aria-label={t("chooseLevel")}
                  className="grid gap-2"
                >
                  {(["view", "assist", "full"] as LinkLevel[]).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      role="radio"
                      aria-checked={l.level === lv}
                      onClick={() => void setLevel(l.id, lv)}
                      className={`min-h-16 rounded-2xl p-3 text-left border-4 ${l.level === lv ? "border-primary bg-soft" : "border-line"}`}
                    >
                      <span className="block font-bold">
                        {t(`level_${lv}` as const)}
                      </span>
                      <span className="block text-sm text-muted">
                        {t(`levelDesc_${lv}` as const)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <BigButton
                variant="surface"
                label={t("revoke")}
                onClick={() => setRevoking(l.id)}
              />
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(revoking)}
        danger
        body={t("revokeConfirm")}
        onOk={revoke}
        onCancel={() => setRevoking(null)}
      />
    </Section>
  );
}
