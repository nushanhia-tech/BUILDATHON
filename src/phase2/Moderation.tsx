import { useNames } from "../components/managers/useNames";
import { PageHeader } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { useRows, PrivateAudio } from "./shared";
import type { VolunteerRow, HelpRow } from "./Help";
import type { Post } from "./Stories";
export default function Moderation({
  section,
}: {
  section: "volunteers" | "help" | "stories";
}) {
  const { t } = useI18n(),
    toast = useToast();
  const table =
    section === "volunteers"
      ? "volunteer_profiles"
      : section === "help"
        ? "help_requests"
        : "posts";
  const { rows, reload, error } = useRows<VolunteerRow & HelpRow & Post>(table);
  const names = useNames(rows.map((r) => r.user_id));
  const comments = useRows<{
    id: string;
    text: string;
    audio_url: string;
    status: string;
  }>("post_comments");
  const update = async (table: string, id: string, patch: object) => {
    const r = await supabase
      .from(table)
      .update(patch)
      .eq(table === "volunteer_profiles" ? "user_id" : "id", id);
    if (r.error) toast(r.error.message, "error");
    else {
      void reload();
      void comments.reload();
    }
  };
  return (
    <div className="grid gap-3">
      <PageHeader
        title={t(
          section === "volunteers"
            ? "volunteerTitle"
            : section === "help"
              ? "myRequests"
              : "moderation",
        )}
        icon="🛡️"
      />
      {error && <p role="alert">{error}</p>}
      {section === "stories" && (
        <section className="card p-4">
          <h2>{t("post_need")}</h2>
          {Object.entries(
            rows
              .filter((r) => r.type === "need")
              .reduce<Record<string, number>>(
                (a, r) => ({ ...a, [r.category]: (a[r.category] || 0) + 1 }),
                {},
              ),
          ).map(([category, count]) => (
            <p key={category}>
              {category}: {count}
            </p>
          ))}
        </section>
      )}
      {rows.map((r) => (
        <article className="card p-4 grid gap-2" key={r.id || r.user_id}>
          {section === "volunteers" ? (
            <>
              <h2>
                {names[r.user_id]} · {r.institution} · {r.area_name}
              </h2>
              <p>{r.skills.join(", ")}</p>
              <BigButton
                label={r.verified ? t("hide") : t("approve")}
                onClick={() =>
                  void update(table, r.user_id, { verified: !r.verified })
                }
              />
            </>
          ) : (
            <>
              <h2 className="font-bold">{r.title}</h2>
              <p>{r.text || r.description}</p>
              {r.audio_url && <PrivateAudio path={r.audio_url} />}
              <p>{r.status}</p>
              {section === "help" &&
                ["open", "accepted", "in_progress"].includes(r.status) && (
                  <BigButton
                    variant="danger"
                    label={t("cancel")}
                    onClick={async () => {
                      const result = await supabase.rpc("transition_help", {
                        request_id: r.id,
                        next_status: "cancelled",
                      });
                      if (result.error) toast(result.error.message, "error");
                      else void reload();
                    }}
                  />
                )}
              {section === "stories" && (
                <div className="flex gap-2">
                  <BigButton
                    label={t("approve")}
                    onClick={() =>
                      void update(table, r.id, { status: "published" })
                    }
                  />
                  <BigButton
                    variant="soft"
                    label={t("hide")}
                    onClick={() =>
                      void update(table, r.id, { status: "hidden" })
                    }
                  />
                </div>
              )}
            </>
          )}
        </article>
      ))}
      {section === "stories" && (
        <>
          <h2>{t("pendingComments")}</h2>
          {comments.rows.map((c) => (
            <article className="card p-4" key={c.id}>
              <p>{c.text}</p>
              {c.audio_url && <PrivateAudio path={c.audio_url} />}
              <div className="flex gap-2">
                <BigButton
                  label={t("approve")}
                  onClick={() =>
                    void update("post_comments", c.id, { status: "published" })
                  }
                />
                <BigButton
                  variant="soft"
                  label={t("hide")}
                  onClick={() =>
                    void update("post_comments", c.id, { status: "hidden" })
                  }
                />
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
