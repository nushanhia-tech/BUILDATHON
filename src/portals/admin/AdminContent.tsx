import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Field, Sheet, Spinner, Tabs } from "../../components/ui/Bits";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import type { Helpline, QuickPhrase, SignCard } from "../../lib/types";
import { Icon } from "../../components/ui/Icon";

type Tab = "signs" | "phrases" | "helplines";

export default function AdminContent() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("signs");
  return (
    <div>
      <h1 className="text-[1.8rem] font-bold mb-4">{t("admContent")}</h1>
      <Tabs big={false} items={[{ key: "signs" as Tab, label: t("signCards") }, { key: "phrases" as Tab, label: t("phrasesTab") }, { key: "helplines" as Tab, label: t("helplinesTab") }]} value={tab} onChange={setTab} />
      {tab === "signs" && <SignsAdmin />}
      {tab === "phrases" && <SimpleCrud<QuickPhrase> table="quick_phrases" filter={(q) => q.is("user_id", null)} order="created_at"
        fields={[{ key: "text_ml", label: t("labelMl") }, { key: "text_en", label: t("labelEn") }, { key: "icon", label: t("icon") }]}
        render={(r) => `${r.icon ?? "💬"} ${r.text_ml} — ${r.text_en ?? ""}`} />}
      {tab === "helplines" && <SimpleCrud<Helpline> table="helplines" order="phone"
        fields={[{ key: "name_ml", label: t("labelMl") }, { key: "name_en", label: t("labelEn") }, { key: "phone", label: t("phone") }, { key: "category", label: t("category") }]}
        render={(r) => `☎️ ${r.name_ml} (${r.name_en ?? ""}) · ${r.phone}`} />}
    </div>
  );
}

function SignsAdmin() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const toast = useToast();
  const [cards, setCards] = useState<SignCard[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState<Partial<SignCard> | null>(null);
  const [img, setImg] = useState<string[]>([]);
  const [del, setDel] = useState<SignCard | null>(null);
  const load = useCallback(async () => { const { data } = await supabase.from("sign_cards").select("*").order("image_url"); setCards((data ?? []) as SignCard[]); }, []);
  useEffect(() => { void load(); }, [load]);
  const cats = useMemo(() => [...new Set((cards ?? []).map((c) => c.category))], [cards]);
  const open = (c: Partial<SignCard>) => { setEdit(c); setImg(c.image_url ? [c.image_url] : []); };
  const save = async () => {
    if (!edit?.meaning_ml || !img[0]) { toast(`${t("image")} / ${t("meaningMl")}`, "error"); return; }
    const row = { image_url: img[0], meaning_ml: edit.meaning_ml, meaning_en: edit.meaning_en || edit.meaning_ml, category: edit.category || "general" };
    const { error } = edit.id ? await supabase.from("sign_cards").update(row).eq("id", edit.id) : await supabase.from("sign_cards").insert({ ...row, created_by: profile!.id });
    if (error) toast(error.message, "error"); else { setEdit(null); void load(); }
  };
  const remove = async () => { await supabase.from("sign_cards").delete().eq("id", del!.id); setDel(null); void load(); };
  if (!cards) return <Spinner />;
  const list = cards.filter((c) => (!cat || c.category === cat) && (!q || `${c.meaning_ml} ${c.meaning_en}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input className="!w-64" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔎 ${t("search")}`} aria-label={t("search")} />
        <select className="!w-48" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t("category")}>
          <option value="">{t("all")}</option>{cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => open({ category: "general" })} className="min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold">+ {t("add")}</button>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {list.map((c) => (
          <li key={c.id} className="tile p-3 flex flex-col gap-2">
            <img src={c.image_url} alt="" className="w-full aspect-square object-contain rounded-xl bg-soft" loading="lazy" />
            <p className="font-bold">{c.meaning_ml}</p>
            <p className="text-muted text-sm">{c.meaning_en} · {c.category}</p>
            <div className="flex gap-1">
              <button onClick={() => open(c)} className="flex-1 min-h-10 rounded-lg bg-soft"><Icon name="edit" size={20} /></button>
              <button onClick={() => setDel(c)} className="flex-1 min-h-10 rounded-lg bg-soft text-danger"><Icon name="trash" size={20} /></button>
            </div>
          </li>
        ))}
      </ul>
      <Sheet open={Boolean(edit)} title={t("signCards")} onClose={() => setEdit(null)}>
        {edit && (
          <div className="flex flex-col gap-3">
            <Field label={t("image")}><PhotoUpload value={img} onChange={setImg} folder="signs" /></Field>
            <Field label={t("meaningMl")}><input value={edit.meaning_ml ?? ""} onChange={(e) => setEdit({ ...edit, meaning_ml: e.target.value })} /></Field>
            <Field label={t("meaningEn")}><input value={edit.meaning_en ?? ""} onChange={(e) => setEdit({ ...edit, meaning_en: e.target.value })} /></Field>
            <Field label={t("category")}><input list="sign-cats" value={edit.category ?? ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></Field>
            <datalist id="sign-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            {img[0] && (
              <div>
                <p className="font-semibold mb-2">{t("userPreview")}</p>
                <div className="tile p-3 flex flex-col items-center gap-2 w-48 mx-auto text-[20px]">
                  <img src={img[0]} alt="" className="w-full aspect-square object-contain rounded-xl bg-soft" />
                  <span className="font-bold text-[1.2rem]">{edit.meaning_ml}</span><span className="text-muted">{edit.meaning_en}</span>
                </div>
              </div>
            )}
            <button onClick={save} className="min-h-14 rounded-2xl bg-primary text-on-primary font-bold">{t("save")}</button>
          </div>
        )}
      </Sheet>
      <ConfirmDialog open={Boolean(del)} danger body={t("confirmDelete")} onOk={remove} onCancel={() => setDel(null)} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SimpleCrud<T extends { id: string }>({ table, fields, render, order, filter }: { table: string; fields: { key: keyof T & string; label: string }[]; render: (r: T) => string; order: string; filter?: (q: any) => any }) {
  const { t } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<T[] | null>(null);
  const [edit, setEdit] = useState<Partial<T> | null>(null);
  const [del, setDel] = useState<T | null>(null);
  const load = useCallback(async () => {
    let q = supabase.from(table).select("*").order(order);
    if (filter) q = filter(q);
    const { data } = await q;
    setRows((data ?? []) as T[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, order]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    if (!edit) return;
    const row = Object.fromEntries(fields.map((f) => [f.key, (edit as Record<string, unknown>)[f.key] || null]));
    const { error } = edit.id ? await supabase.from(table).update(row).eq("id", edit.id) : await supabase.from(table).insert(row);
    if (error) toast(error.message, "error"); else { setEdit(null); void load(); }
  };
  const remove = async () => { const { error } = await supabase.from(table).delete().eq("id", del!.id); setDel(null); if (error) toast(error.message, "error"); else void load(); };
  if (!rows) return <Spinner />;
  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <button onClick={() => setEdit({})} className="self-start min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold">+ {t("add")}</button>
      <ul className="card divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="p-3 flex items-center gap-3">
            <span className="flex-1">{render(r)}</span>
            <button onClick={() => setEdit(r)} className="min-h-10 min-w-10 rounded-lg bg-soft" aria-label={t("edit")}><Icon name="edit" size={20} /></button>
            <button onClick={() => setDel(r)} className="min-h-10 min-w-10 rounded-lg bg-soft text-danger" aria-label={t("delete")}><Icon name="trash" size={20} /></button>
          </li>
        ))}
      </ul>
      <Sheet open={Boolean(edit)} title={edit?.id ? t("edit") : t("add")} onClose={() => setEdit(null)}>
        {edit && (
          <div className="flex flex-col gap-3">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input value={String((edit as Record<string, unknown>)[f.key] ?? "")} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
              </Field>
            ))}
            <button onClick={save} className="min-h-14 rounded-2xl bg-primary text-on-primary font-bold">{t("save")}</button>
          </div>
        )}
      </Sheet>
      <ConfirmDialog open={Boolean(del)} danger body={t("confirmDelete")} onOk={remove} onCancel={() => setDel(null)} />
    </div>
  );
}
