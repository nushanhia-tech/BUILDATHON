import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useI18n } from "../lib/i18n";
import { useAuth } from "./AuthProvider";
import { homeFor } from "./RoleGuard";
import { errMsg, useToast } from "../hooks/useToast";
import { Field } from "../components/ui/Bits";
import type { Role } from "../lib/types";
import { Icon } from "../components/ui/Icon";

function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <button type="button" onClick={() => setLang(lang === "ml" ? "en" : "ml")} aria-label={t("language")}
      className="min-h-12 px-4 rounded-full bg-surface border-2 border-line font-semibold">
      <Icon name="globe" size={18} className="inline-block align-[-0.25em] mr-1.5" />{lang === "ml" ? "English" : "മലയാളം"}
    </button>
  );
}

function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const { t, lang } = useI18n();
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Sa Hai">
        <a className="brand" href="/"><img src="/icon-192.png" alt="" className="brand-logo" /> Sa Hai</a>
        <div className="auth-story-copy">
          <p className="eyebrow">{lang === "en" ? "A LITTLE HELP. EVERY DAY." : "ഓരോ ദിവസവും, നിങ്ങൾക്കൊപ്പം"}</p>
          <h2>{lang === "en" ? <>Your day.<br />A little easier.</> : <>നിങ്ങളുടെ ദിവസം.<br />കൂടുതൽ എളുപ്പം.</>}</h2>
          <p>{t("tagline")}</p>
        </div>
        <div className="care-illustration" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><img src="/logo.png" alt="" className="care-logo" /><span className="floating-token token-one">♡</span><span className="floating-token token-two">✧</span><span className="floating-token token-three">♫</span></div>
        <div className="auth-story-foot"><span>Sa Hai · സഹായ്</span><span>{lang === "en" ? "Made for you" : "നിങ്ങൾക്കായി"} ↗</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-language"><LangSwitch /></div>
        <div className="auth-form-wrap">
          <div className="auth-heading"><img src="/icon-192.png" alt="" className="auth-mark auth-logo" /><p className="eyebrow">{lang === "en" ? "WELCOME TO SA HAI" : "Sa Hai · സഹായ്"}</p><h1>{title}</h1><p className="text-muted">{sub}</p></div>
          {!supabaseConfigured && <p role="status" className="setup-notice">{t("setupMissing")}</p>}
          <div className="auth-form">{children}</div>
          <p className="auth-footer">{t("tagline")}</p>
        </div>
      </section>
    </main>
  );
}

export function LoginPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { session, profile } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  if (session && profile && !profile.blocked) return <Navigate to={homeFor(profile.role)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      nav(homeFor((p?.role as Role) ?? "user"), { replace: true });
    } catch (err) { toast(errMsg(err), "error"); }
    finally { setBusy(false); }
  };
  const fill = (e: string) => { setEmail(e); setPassword("NilaDemo@123"); };

  return (
    <AuthShell title={t("loginTitle")} sub={t("loginSub")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("email")}><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t("password")}><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button disabled={busy} className="min-h-16 rounded-3xl bg-primary text-on-primary font-bold text-xl">{busy ? t("loading") : t("login")}</button>
      </form>
      <p className="mt-5 text-center">{t("noAccount")} <Link className="text-primary font-bold underline" to="/signup">{t("signup")}</Link></p>
      <details className="mt-5 text-sm text-muted">
        <summary className="cursor-pointer font-semibold">{t("demoAccounts")}</summary>
        <div className="flex flex-col gap-2 mt-3">
          {["user@nila.demo", "family@nila.demo", "admin@nila.demo"].map((e) => (
            <button key={e} type="button" onClick={() => fill(e)} className="min-h-12 rounded-2xl bg-soft text-primary font-semibold">{e}</button>
          ))}
          <span>Password: NilaDemo@123</span>
        </div>
      </details>
    </AuthShell>
  );
}

export function SignupPage() {
  const { t } = useI18n();
  const toast = useToast();
  const nav = useNavigate();
  const [role, setRole] = useState<"user" | "family">("user");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password, options: { data: { role, name: name.trim(), phone: phone.trim() || null } },
      });
      if (error) throw error;
      // No email verification: if signUp returned no session, log in straight away.
      let session = data.session;
      if (!session) {
        const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        session = res.data.session;
      }
      if (session) nav(role === "family" ? "/family" : "/app/onboarding", { replace: true });
      else { toast(t("signupDone"), "success"); nav("/login"); }
    } catch (err) { toast(errMsg(err), "error"); }
    finally { setBusy(false); }
  };

  const roles = [
    { key: "user" as const, icon: "🙋", label: t("iAmUser"), sub: t("iAmUserSub") },
    { key: "family" as const, icon: "👨‍👩‍👧", label: t("iAmFamily"), sub: t("iAmFamilySub") },
  ];
  return (
    <AuthShell title={t("signup")} sub={t("chooseRole")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div role="radiogroup" aria-label={t("chooseRole")} className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={role === r.key} onClick={() => setRole(r.key)}
              className={`min-h-24 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 border-2 font-bold ${role === r.key ? "border-primary bg-soft" : "border-line bg-surface"}`}>
              <span className="text-4xl" aria-hidden="true">{r.icon}</span>
              <span>{r.label}</span>
              <span className="text-sm font-normal text-muted">{r.sub}</span>
            </button>
          ))}
        </div>
        <Field label={t("name")}><input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
        <Field label={`${t("phone")} ${t("optional")}`}><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></Field>
        <Field label={t("email")}><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label={t("password")} hint={t("passwordMin")}><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
        <button disabled={busy} className="min-h-16 rounded-3xl bg-primary text-on-primary font-bold text-xl">{busy ? t("loading") : t("signup")}</button>
      </form>
      <p className="mt-5 text-center">{t("haveAccount")} <Link className="text-primary font-bold underline" to="/login">{t("login")}</Link></p>
    </AuthShell>
  );
}
