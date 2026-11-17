import { useOptionalUserSettings } from "../hooks/useUserSettings";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { PageHeader, Field } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { VoiceInput } from "../components/ui/VoiceInput";
export const NEEDS = [
  "wheelchair",
  "hearing_aid",
  "spectacles",
  "medicine_support",
  "pension_help",
  "home_care",
  "transport",
  "digital_help",
  "food",
  "housing",
  "employment",
  "other",
] as const;
export const DISABILITIES = [
  "vision",
  "hearing",
  "mobility",
  "speech",
  "intellectual",
  "multiple",
  "none",
] as const;
export const PANCHAYATS = [
  "Pattambi",
  "Ongallur",
  "Muthuthala",
  "Kulukkallur",
  "Thiruvegappura",
];
const QUESTIONS = [
  "ageGroup",
  "gender",
  "district",
  "panchayat",
  "ward",
  "disabilities",
  "livesAlone",
  "hasCaregiver",
  "surveyNeeds",
  "hasCertificate",
  "receivesPension",
  "internetAccess",
  "mainDifficulty",
] as const;
export default function Survey({ userId }: { userId?: string }) {
  const settings = useOptionalUserSettings();
  const { profile } = useAuth(),
    { t } = useI18n(),
    toast = useToast(),
    nav = useNavigate();
  const [consent, setConsent] = useState(false),
    [step, setStep] = useState(0),
    [answers, setAnswers] = useState<
      Record<string, string | string[] | boolean>
    >({}),
    [busy, setBusy] = useState(false);
  const question = QUESTIONS[step];
  const set = (v: string | string[] | boolean) =>
    setAnswers({ ...answers, [question]: v });
  const bool = [
    "livesAlone",
    "hasCaregiver",
    "hasCertificate",
    "receivesPension",
  ].includes(question);
  const finish = async () => {
    setBusy(true);
    const r = await supabase
      .from("needs_surveys")
      .insert({
        subject_user_id:
          userId ||
          (["volunteer"].includes(profile!.role) ? null : profile!.id),
        consent_given: true,
        age_group: answers.ageGroup || null,
        gender: answers.gender || null,
        district: answers.district || null,
        panchayat_or_municipality: answers.panchayat || null,
        ward: answers.ward || null,
        disability_types: answers.disabilities || [],
        lives_alone: answers.livesAlone ?? null,
        has_caregiver: answers.hasCaregiver ?? null,
        needs: answers.surveyNeeds || [],
        has_disability_certificate: answers.hasCertificate ?? null,
        receives_pension: answers.receivesPension ?? null,
        internet_access: answers.internetAccess || null,
        main_difficulty: answers.mainDifficulty || null,
      });
    setBusy(false);
    if (r.error) toast(r.error.message, "error");
    else {
      toast(t("surveySubmitted"), "success");
      nav(profile!.role === "volunteer" ? "/volunteer" : "/app");
    }
  };
  if (!consent)
    return (
      <div className="grid gap-5">
        <PageHeader
          title={t("surveyTitle")}
          help={t("surveyConsent")}
          icon="📝"
        />
        <BigButton label={t("surveyAgree")} onClick={() => setConsent(true)} />
        <BigButton
          variant="surface"
          label={t("surveyDecline")}
          onClick={() => nav(-1)}
        />
      </div>
    );
  const options =
    question === "ageGroup"
      ? ["<18", "18-40", "41-60", "61-75", "75+"]
      : question === "disabilities"
        ? [...DISABILITIES]
        : question === "surveyNeeds"
          ? [...NEEDS]
          : question === "internetAccess"
            ? ["none", "basic", "good"]
            : bool
              ? ["yes", "no"]
              : null;
  const multi = question === "disabilities" || question === "surveyNeeds";
  const selected = (answers[question] || []) as string[];
  return (
    <div className="max-w-xl mx-auto grid gap-5">
      <PageHeader title={t(question)} help={t("surveyTitle")} icon="📝" />
      <progress className="w-full" value={step + 1} max={QUESTIONS.length} />
      <p>
        {step + 1} / {QUESTIONS.length}
      </p>
      {options ? (
        <div className="grid grid-cols-2 gap-3">
          {options.map((o) => {
            const checked = multi
              ? selected.includes(o)
              : bool
                ? answers[question] === (o === "yes")
                : answers[question] === o;
            const label =
              question === "ageGroup"
                ? o
                : ["vision", "hearing", "mobility"].includes(o)
                  ? t(`mode_${o}` as never)
                  : t(
                      (o === "wheelchair"
                        ? "wheelchair_need"
                        : o === "other"
                          ? "other_help"
                          : o) as never,
                    );
            return (
              <button
                key={o}
                aria-pressed={checked}
                className={`min-h-20 p-4 rounded-3xl border-2 ${checked ? "bg-primary text-white border-primary" : "bg-surface border-line"}`}
                onClick={() =>
                  set(
                    multi
                      ? checked
                        ? selected.filter((x) => x !== o)
                        : [...selected, o]
                      : bool
                        ? o === "yes"
                        : o,
                  )
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <Field label={t(question)}>
            <textarea
              value={String(answers[question] || "")}
              onChange={(e) => set(e.target.value)}
            />
          </Field>
          {(!settings ||
            settings
              .features("needs_survey")
              .some((f) => f.key === "survey_voice")) && (
            <VoiceInput onSubmit={(v) => set(v)} />
          )}
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <BigButton
          variant="surface"
          label={t("back")}
          onClick={() => (step ? setStep(step - 1) : setConsent(false))}
        />
        <BigButton
          disabled={busy}
          label={step === QUESTIONS.length - 1 ? t("save") : t("next")}
          onClick={() =>
            step === QUESTIONS.length - 1 ? void finish() : setStep(step + 1)
          }
        />
      </div>
      <button
        className="min-h-12 text-muted"
        disabled={busy}
        onClick={() =>
          step === QUESTIONS.length - 1 ? void finish() : setStep(step + 1)
        }
      >
        {t("skip")}
      </button>
    </div>
  );
}
