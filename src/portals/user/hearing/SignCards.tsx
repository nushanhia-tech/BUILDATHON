import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { speak } from "../../../lib/tts";
import { Empty, Spinner } from "../../../components/ui/Bits";
import type { SignCard } from "../../../lib/types";
import { Icon } from "../../../components/ui/Icon";

export function SignCards() {
  const { t, lang } = useI18n();
  const [cards, setCards] = useState<SignCard[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<SignCard | null>(null);

  useEffect(() => { void supabase.from("sign_cards").select("*").order("image_url").then(({ data }) => setCards((data ?? []) as SignCard[])); }, []);
  const cats = useMemo(() => [...new Set((cards ?? []).map((c) => c.category))], [cards]);
  const list = (cards ?? []).filter((c) => (!cat || c.category === cat) &&
    (!q || `${c.meaning_ml} ${c.meaning_en}`.toLowerCase().includes(q.toLowerCase())));
  const dayIdx = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const sod = cards?.length ? cards[dayIdx % cards.length] : null;
  const show = (c: SignCard) => { setOpen(c); speak(lang === "en" ? c.meaning_en : c.meaning_ml, { force: true }); };

  if (!cards) return <Spinner />;
  return (
    <div className="flex flex-col gap-4">
      {sod && (
        <button type="button" onClick={() => show(sod)} className="hero p-4 flex items-center gap-4 text-left">
          <img src={sod.image_url} alt="" className="w-28 h-28 rounded-2xl bg-white object-contain" />
          <span><span className="block opacity-90"><Icon name="star" size={18} className="inline-block align-[-0.25em] mr-1.5" />{t("signOfDay")}</span><span className="block text-[1.8rem] font-bold">{sod.meaning_ml}</span><span className="block">{sod.meaning_en}</span></span>
        </button>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔎 ${t("search")}`} aria-label={t("search")} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["", ...cats].map((c) => (
          <button key={c || "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
            className={`shrink-0 min-h-12 px-4 rounded-full border-2 font-semibold ${cat === c ? "bg-primary text-on-primary border-primary" : "bg-surface border-line"}`}>
            {c || t("all")}
          </button>
        ))}
      </div>
      {list.length === 0 ? <Empty text={t("noSigns")} icon="✋" /> : (
        <ul className="grid grid-cols-2 gap-3">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => show(c)} className="tile w-full p-3 flex flex-col items-center gap-2" aria-label={`${c.meaning_ml} — ${c.meaning_en}`}>
                <img src={c.image_url} alt="" className="w-full aspect-square object-contain rounded-xl bg-soft" loading="lazy" />
                <span className="font-bold text-[1.2rem]">{c.meaning_ml}</span>
                <span className="text-muted text-base">{c.meaning_en}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={open.meaning_ml} className="fixed inset-0 z-[900] bg-surface flex flex-col items-center justify-center gap-4 p-6" onClick={() => setOpen(null)}>
          <img src={open.image_url} alt={open.meaning_en} className="w-full max-w-md aspect-square object-contain rounded-3xl bg-soft" />
          <p className="text-[3rem] font-extrabold">{open.meaning_ml}</p>
          <p className="text-2xl text-muted">{open.meaning_en}</p>
          <button className="min-h-16 px-10 rounded-3xl bg-primary text-on-primary font-bold text-xl">{t("close")}</button>
        </div>
      )}
    </div>
  );
}
