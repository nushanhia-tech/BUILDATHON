import { Fragment, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useCatalogue } from "../../hooks/useUserSettings";
import { useToast } from "../../hooks/useToast";
import { Sheet, Spinner, Toggle, Field } from "../../components/ui/Bits";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { isCustom } from "../../lib/modules";
import type { ModuleRow, SubFeature } from "../../lib/types";
import { Icon } from "../../components/ui/Icon";

const ICONS = ["💊", "📋", "👁️", "🦻", "♿", "🆘", "🏥", "📞", "🌐", "🛒", "🍲", "🚌", "🙏", "🎵", "📻", "📖", "🧘", "☎️", "🏦", "⭐"];

export default function AdminModules() {
  const { t } = useI18n();
  const toast = useToast();
  const { modules, subFeatures, loaded, reload } = useCatalogue();
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<ModuleRow> | null>(null);
  const [del, setDel] = useState<ModuleRow | null>(null);

  const patch = async (id: number, p: Partial<ModuleRow>) => {
    const { error } = await supabase.from("modules").update(p).eq("id", id);
    if (error) toast(error.message, "error"); else void reload();
  };
  const patchSub = async (id: number, p: Partial<SubFeature>) => {
    const { error } = await supabase.from("sub_features").update(p).eq("id", id);
    if (error) toast(error.message, "error"); else void reload();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = modules[i], b = modules[i + dir];
    if (!a || !b) return;
    await supabase.from("modules").update({ default_order: b.default_order }).eq("id", a.id);
    await supabase.from("modules").update({ default_order: a.default_order === b.default_order ? a.default_order + dir : a.default_order }).eq("id", b.id);
    void reload();
  };
  const saveEdit = async () => {
    if (!edit?.label_ml) return;
    const row = { label_ml: edit.label_ml, label_en: edit.label_en || edit.label_ml, icon: edit.icon || "⭐", color: edit.color || "#2f6fed", link_url: edit.link_url ?? null };
    const { error } = edit.id
      ? await supabase.from("modules").update(row).eq("id", edit.id)
      : await supabase.from("modules").insert({ ...row, key: `custom_${Date.now().toString(36)}`, default_order: Math.max(0, ...modules.map((m) => m.default_order)) + 1 });
    if (error) toast(error.message, "error"); else { setEdit(null); void reload(); }
  };
  const remove = async () => { const { error } = await supabase.from("modules").delete().eq("id", del!.id); setDel(null); if (error) toast(error.message, "error"); else void reload(); };

  if (!loaded) return <Spinner />;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-[1.8rem] font-bold flex-1">{t("admModules")}</h1>
        <button onClick={() => setEdit({ label_ml: "", label_en: "", icon: "⭐", color: "#2f6fed", link_url: "" })} className="min-h-12 px-5 rounded-2xl bg-primary text-on-primary font-bold">{t("newButton")}</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-soft"><tr>
            <th className="p-3">{t("order")}</th><th className="p-3">{t("icon")}</th><th className="p-3">{t("labelMl")}</th><th className="p-3">{t("labelEn")}</th>
            <th className="p-3">{t("color")}</th><th className="p-3">{t("enabledGlobally")}</th><th className="p-3">{t("actions")}</th>
          </tr></thead>
          <tbody>
            {modules.map((m, i) => {
              const subs = subFeatures.filter((f) => f.module_key === m.key);
              return (
                <Fragment key={m.id}>
                  <tr className="border-t border-line">
                    <td className="p-2 whitespace-nowrap">
                      <button disabled={i === 0} onClick={() => void move(i, -1)} aria-label={t("moveUp")} className="min-h-10 min-w-10 rounded-lg bg-soft disabled:opacity-30">↑</button>{" "}
                      <button disabled={i === modules.length - 1} onClick={() => void move(i, 1)} aria-label={t("moveDown")} className="min-h-10 min-w-10 rounded-lg bg-soft disabled:opacity-30">↓</button>
                    </td>
                    <td className="p-2 text-2xl">{m.icon}</td>
                    <td className="p-2 font-semibold">{m.label_ml}{isCustom(m.key) && <span className="block text-xs text-muted"><Icon name="link" size={18} className="inline-block align-[-0.25em] mr-1.5" />{m.link_url}</span>}</td>
                    <td className="p-2">{m.label_en}</td>
                    <td className="p-2"><span className="inline-block w-6 h-6 rounded-full align-middle" style={{ background: m.color }} /></td>
                    <td className="p-2"><Toggle label="" checked={m.enabled_globally} onChange={(v) => void patch(m.id, { enabled_globally: v })} /></td>
                    <td className="p-2 whitespace-nowrap">
                      <button onClick={() => setEdit(m)} className="min-h-10 px-3 rounded-lg bg-soft"><Icon name="edit" size={20} /></button>{" "}
                      {subs.length > 0 && <button onClick={() => setOpen(open === m.key ? null : m.key)} aria-expanded={open === m.key} className="min-h-10 px-3 rounded-lg bg-soft">{t("subFeatures")} ({subs.length})</button>}
                      {isCustom(m.key) && <button onClick={() => setDel(m)} className="min-h-10 px-3 rounded-lg bg-soft text-danger ml-1"><Icon name="trash" size={20} /></button>}
                    </td>
                  </tr>
                  {open === m.key && subs.map((f) => (
                    <tr key={`f${f.id}`} className="bg-soft/40">
                      <td /><td className="p-2 text-muted">↳</td>
                      <td className="p-2"><input defaultValue={f.label_ml} onBlur={(e) => e.target.value !== f.label_ml && void patchSub(f.id, { label_ml: e.target.value })} aria-label={t("labelMl")} className="!min-h-10" /></td>
                      <td className="p-2"><input defaultValue={f.label_en} onBlur={(e) => e.target.value !== f.label_en && void patchSub(f.id, { label_en: e.target.value })} aria-label={t("labelEn")} className="!min-h-10" /></td>
                      <td className="p-2 text-xs text-muted">{f.key}</td>
                      <td className="p-2"><Toggle label="" checked={f.enabled_globally} onChange={(v) => void patchSub(f.id, { enabled_globally: v })} /></td>
                      <td />
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Sheet open={Boolean(edit)} title={edit?.id ? t("edit") : t("customButton")} onClose={() => setEdit(null)}>
        {edit && (
          <div className="flex flex-col gap-3">
            <Field label={t("labelMl")}><input value={edit.label_ml ?? ""} onChange={(e) => setEdit({ ...edit, label_ml: e.target.value })} /></Field>
            <Field label={t("labelEn")}><input value={edit.label_en ?? ""} onChange={(e) => setEdit({ ...edit, label_en: e.target.value })} /></Field>
            <fieldset><legend className="font-semibold mb-1">{t("icon")}</legend>
              <div className="flex flex-wrap gap-1">{ICONS.map((ic) => (
                <button key={ic} type="button" aria-pressed={edit.icon === ic} onClick={() => setEdit({ ...edit, icon: ic })} className={`w-12 h-12 rounded-xl text-2xl border-2 ${edit.icon === ic ? "border-primary bg-soft" : "border-line"}`}>{ic}</button>
              ))}</div>
              <input className="mt-2" value={edit.icon ?? ""} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} aria-label={t("icon")} />
            </fieldset>
            <Field label={t("color")}><input type="color" value={edit.color ?? "#2f6fed"} onChange={(e) => setEdit({ ...edit, color: e.target.value })} className="!p-1 !h-12" /></Field>
            {(!edit.id || isCustom(edit.key ?? "")) && <Field label={t("linkTarget")}><input value={edit.link_url ?? ""} onChange={(e) => setEdit({ ...edit, link_url: e.target.value })} placeholder="https://… / 1800…" /></Field>}
            <button onClick={saveEdit} className="min-h-14 rounded-2xl bg-primary text-on-primary font-bold">{t("save")}</button>
          </div>
        )}
      </Sheet>
      <ConfirmDialog open={Boolean(del)} danger body={t("confirmDelete")} onOk={remove} onCancel={() => setDel(null)} />
    </div>
  );
}
