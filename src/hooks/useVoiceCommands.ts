import { useOptionalUserSettings } from "./useUserSettings";
import { MODULE_ROUTES } from "../lib/modules";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { parseCommand, keywords, matchScore } from "../lib/voiceRouter";
import { speak } from "../lib/tts";
import { useI18n } from "../lib/i18n";
import { endOfDay, fmtTime, fmtDateTime, startOfDay } from "../lib/time";
import type { Contact, MemoryNote, Task } from "../lib/types";

/** Executes voice/text commands for the signed-in user. Returns a reply to show + speak. */
export function useVoiceCommands(userId: string) {
  const nav = useNavigate();
  const settings = useOptionalUserSettings();
  const { t, lang } = useI18n();
  const [reply, setReply] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);

  const say = useCallback((msg: string) => {
    setReply(msg);
    speak(msg, { force: true });
  }, []);

  const run = useCallback(
    async (text: string) => {
      setUnknown(false);
      const normalized = text.trim().toLocaleLowerCase();
      const alias = settings?.visible.find((m) =>
        [m.label_ml, m.label_en].some(
          (l) => l && normalized === l.trim().toLocaleLowerCase(),
        ),
      );
      if (alias && MODULE_ROUTES[alias.key]) {
        nav(MODULE_ROUTES[alias.key]);
        return;
      }
      const featureAlias = settings?.subFeatures.find(
        (f) =>
          settings.settings?.custom_labels?.[f.key]
            ?.trim()
            .toLocaleLowerCase() === normalized &&
          settings.features(f.module_key).some((x) => x.key === f.key),
      );
      if (featureAlias && MODULE_ROUTES[featureAlias.module_key]) {
        nav(
          MODULE_ROUTES[featureAlias.module_key] +
            ((
              {
                ocr: "?tab=ocr",
                objects: "?tab=objects",
                light: "?tab=light",
                talk_bridge: "?tab=talk",
                sound_alert: "?tab=alert",
                sign_cards: "?tab=signs",
                find: "?tab=find",
                give: "?tab=give",
              } as Record<string, string>
            )[featureAlias.key] || ""),
        );
        return;
      }
      if (/ഡോക്ട.*വിളി|call.*doctor|doctor.*call/i.test(text)) {
        nav("/app/family?category=doctor");
        return;
      }
      if (
        /വെള്ളം കുടിച്ചു|drank (?:a |one )?(?:glass|water)/i.test(text) &&
        settings?.isOn("water")
      ) {
        const r = await supabase
          .from("water_settings")
          .select("glass_ml")
          .eq("user_id", userId)
          .maybeSingle();
        const logged = await supabase
          .from("water_logs")
          .insert({ user_id: userId, amount_ml: r.data?.glass_ml || 250 });
        say(logged.error ? t("error") : t("saved"));
        return;
      }
      const intent = parseCommand(text);
      switch (intent.kind) {
        case "open_medicines":
          nav("/app/medicines");
          return;
        case "open_ocr":
          nav("/app/vision?tab=ocr");
          return;
        case "open_wheelchair":
          nav("/app/wheelchair?tab=find");
          return;
        case "sos":
          nav("/app/family?sos=1");
          return; // confirm dialog opens there — never auto-send
        case "read_tasks": {
          const { data } = await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", userId)
            .eq("done", false)
            .gte("due_at", startOfDay().toISOString())
            .lte("due_at", endOfDay().toISOString())
            .order("due_at");
          const list = ((data ?? []) as Task[]).filter(
            (x) => !x.needs_confirmation,
          );
          say(
            list.length
              ? t("vrTodayTasks", {
                  list: list
                    .map(
                      (x) =>
                        `${x.title} ${x.due_at ? fmtTime(x.due_at, lang) : ""}`,
                    )
                    .join(", "),
                })
              : t("vrNoTasks"),
          );
          return;
        }
        case "create_task": {
          const { error } = await supabase
            .from("tasks")
            .insert({
              user_id: userId,
              title: intent.title,
              due_at: intent.due.toISOString(),
            });
          if (error) {
            say(t("error"));
            return;
          }
          say(
            t("vrTaskCreated", {
              title: intent.title,
              when: fmtDateTime(intent.due, lang),
            }),
          );
          return;
        }
        case "save_note": {
          const { error } = await supabase
            .from("memory_notes")
            .insert({ user_id: userId, text: intent.text });
          say(error ? t("error") : t("vrNoteSaved", { text: intent.text }));
          return;
        }
        case "where": {
          const { data } = await supabase
            .from("memory_notes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(200);
          const words = keywords(intent.query);
          const best = ((data ?? []) as MemoryNote[])
            .map((n) => ({ n, s: matchScore(n.text, words) }))
            .filter((x) => x.s > 0)
            .sort(
              (a, b) =>
                b.s - a.s ||
                +new Date(b.n.created_at) - +new Date(a.n.created_at),
            )[0];
          say(best ? t("vrFound", { text: best.n.text }) : t("vrNotFound"));
          return;
        }
        case "call_contact": {
          const { data } = await supabase
            .from("contacts")
            .select("*")
            .eq("user_id", userId)
            .eq("needs_confirmation", false);
          const words = keywords(intent.name);
          const best = ((data ?? []) as Contact[])
            .map((c) => ({
              c,
              s: matchScore(`${c.name} ${c.relation ?? ""}`, words),
            }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)[0];
          if (best) nav(`/app/family?contact=${best.c.id}`);
          else say(t("vrContactNotFound"));
          return;
        }
        default:
          setUnknown(true);
          say(t("vrNotUnderstood"));
      }
    },
    [nav, say, t, lang, userId, settings],
  );

  return {
    run,
    reply,
    unknown,
    clear: () => {
      setReply(null);
      setUnknown(false);
    },
  };
}
