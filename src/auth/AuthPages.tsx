import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useI18n } from "../lib/i18n";
import { useAuth } from "./AuthProvider";
import { homeFor } from "./RoleGuard";
import { errMsg, useToast } from "../hooks/useToast";
import { Field } from "../components/ui/Bits";
import type { Role } from "../lib/types";

function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <button type="button" onClick={() => setLang(lang === "ml" ? "en" : "ml")} aria-label={t("language")}
      className="min-h-12 px-4 rounded-full bg-surface border-2 border-line font-semibold">
      🌐 {lang === "ml" ? "English" : "മലയാളം"}
    </button>
  );
}

function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="min-h-screen user-bg flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-md flex justify-end"><LangSwitch /></div>
      <div className="w-full max-w-md flex flex-col items-center text-center gap-2 mt-4 mb-6">
        <img src="/icon.svg" alt="" className="w-20 h-20 rounded-3xl shadow-lg" />
        <p className="text-primary font-bold text-xl">{t("appName")} · Nila</p>
        <h1 className="text-[1.8rem] font-bold">{title}</h1>
        <p className="text-muted">{sub}</p>
      </div>
      {!supabaseConfigured && <p className="w-full max-w-md card p-4 mb-4 text-danger font-semibold">{t("setupMissing")}</p>}
      <div className="w-full max-w-md card p-6">{children}</div>
      <p className="text-muted text-sm mt-6">{t("tagline")}</p>
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
      if (data.session) nav(role === "family" ? "/family" : "/app/onboarding", { replace: true });
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
              className={`min-h-28 rounded-3xl p-3 flex flex-col items-center justify-center gap-1 border-4 font-bold ${role === r.key ? "border-primary bg-soft" : "border-line bg-surface"}`}>
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
