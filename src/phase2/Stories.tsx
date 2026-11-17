import { useOptionalUserSettings } from "../hooks/useUserSettings";
import { NEEDS } from "./Survey";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { PageHeader, Field, Toggle } from "../components/ui/Bits";
import { BigButton } from "../components/ui/BigButton";
import { ReadAloudButton } from "../components/ui/ReadAloudButton";
import { VoiceInput } from "../components/ui/VoiceInput";
import { PhotoUpload } from "../components/ui/PhotoUpload";
import { useRows, VoiceClip, PrivateAudio } from "./shared";
import { ReportButton } from "./Help";
const TYPES = ["story", "opinion", "need", "tip", "achievement"] as const;
export interface Post {
  id: string;
  title: string;
  text: string;
  audio_url: string;
  image_urls: string[];
  image_alt: string;
  transcript: string;
  type: string;
  status: string;
  is_anonymous: boolean;
  author_name: string;
  accessibility_tags: string[];
  category: string;
}
export default function Stories({ create = false }: { create?: boolean }) {
  const { t, lang } = useI18n(),
    toast = useToast(),
    nav = useNavigate();
  const { rows, error } = useRows<Post>("posts_feed");
  const [filter, setFilter] = useState("all"),
    [tag, setTag] = useState("all"),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [d, setD] = useState({
      title: "",
      text: "",
      transcript: "",
      audio_url: "",
      image_urls: [] as string[],
      image_alt: "",
      type: "story",
      is_anonymous: false,
      accessibility_tags: [] as string[],
      category: "other",
    });
  if (create)
    return (
      <div className="grid gap-4">
        <PageHeader title={t("newStory")} icon="🎤" />
        {preview ? (
          <>
            <h2 className="text-2xl font-bold">{d.title}</h2>
            <p>{d.text}</p>
            {d.audio_url && <PrivateAudio path={d.audio_url} />}
            {d.image_urls.map((u) => (
              <img
                key={u}
                src={u}
                alt={d.image_alt || d.title}
                className="rounded-3xl max-h-80 object-contain"
              />
            ))}
            <ReadAloudButton text={[d.title, d.text]} />
            <BigButton
              label={t("send")}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await supabase.from("posts").insert({
                  ...d,
                  transcript: d.text,
                  language: lang,
                  status: "pending",
                });
                setBusy(false);
                if (r.error) toast(r.error.message, "error");
                else {
                  toast(t("postPending"), "success");
                  nav("/app/stories");
                }
              }}
            />
            <BigButton
              variant="soft"
              label={t("back")}
              onClick={() => setPreview(false)}
            />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((type) => (
                <button
                  className={`min-h-16 p-3 rounded-2xl ${d.type === type ? "bg-primary text-white" : "bg-soft"}`}
                  key={type}
                  onClick={() => setD({ ...d, type })}
                >
                  {t(`post_${type}`)}
                </button>
              ))}
            </div>
            <Field label={t("postTitle")}>
              <input
                required
                maxLength={150}
                value={d.title}
                onChange={(e) => setD({ ...d, title: e.target.value })}
              />
            </Field>
            <Field label={t("postText")}>
              <textarea
                rows={5}
                value={d.text}
                onChange={(e) => setD({ ...d, text: e.target.value })}
              />
            </Field>
            <VoiceInput onSubmit={(text) => setD({ ...d, text })} />
            <VoiceClip
              value={d.audio_url}
              onChange={(audio_url) => setD((prev) => ({ ...prev, audio_url }))}
              onTranscript={(text) =>
                setD((prev) => ({
                  ...prev,
                  text: (prev.text + " " + text).trim(),
                }))
              }
            />
            <PhotoUpload
              folder="stories"
              max={6}
              value={d.image_urls}
              onChange={(image_urls) => setD({ ...d, image_urls })}
            />
            {!!d.image_urls.length && (
              <Field label={t("imageAlt")}>
                <input
                  value={d.image_alt}
                  onChange={(e) => setD({ ...d, image_alt: e.target.value })}
                />
              </Field>
            )}
            <Field label={t("category")}>
              <select
                value={d.category}
                onChange={(e) => setD({ ...d, category: e.target.value })}
              >
                {NEEDS.map((n) => (
                  <option key={n} value={n}>
                    {t(
                      (n === "wheelchair"
                        ? "wheelchair_need"
                        : n === "other"
                          ? "other_help"
                          : n) as never,
                    )}
                  </option>
                ))}
              </select>
            </Field>
            <Toggle
              label={t("anonymous")}
              checked={d.is_anonymous}
              onChange={(is_anonymous) => setD({ ...d, is_anonymous })}
            />
            <fieldset>
              <legend>{t("postTags")}</legend>
              {(["vision", "hearing", "mobility", "simple"] as const).map(
                (k) => (
                  <Toggle
                    key={k}
                    label={t(`mode_${k}`)}
                    checked={d.accessibility_tags.includes(k)}
                    onChange={(v) =>
                      setD({
                        ...d,
                        accessibility_tags: v
                          ? [...d.accessibility_tags, k]
                          : d.accessibility_tags.filter((x) => x !== k),
                      })
                    }
                  />
                ),
              )}
            </fieldset>
            <BigButton
              label={t("postPreview")}
              onClick={() => {
                if (d.title.trim() && d.text.trim()) setPreview(true);
              }}
            />
          </>
        )}
      </div>
    );
  return (
    <div className="grid gap-4">
      <PageHeader title={t("storiesTitle")} icon="📖" />
      <Link
        className="min-h-16 rounded-3xl bg-primary text-white p-4 text-center"
        to="/app/stories/new"
      >
        🎤 {t("newStory")}
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label={t("category")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("all")}</option>
          {TYPES.map((k) => (
            <option key={k} value={k}>
              {t(`post_${k}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("postTags")}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="all">{t("all")}</option>
          {(["vision", "hearing", "mobility", "simple"] as const).map((k) => (
            <option key={k} value={k}>
              {t(`mode_${k}`)}
            </option>
          ))}
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      {rows
        .filter(
          (p) =>
            (filter === "all" || p.type === filter) &&
            (tag === "all" || p.accessibility_tags.includes(tag)),
        )
        .map((p) => (
          <StoryCard key={p.id} post={p} />
        ))}
    </div>
  );
}
function StoryCard({ post: p }: { post: Post }) {
  const options = useOptionalUserSettings();
  const { t } = useI18n(),
    { profile } = useAuth(),
    toast = useToast();
  const [comment, setComment] = useState(""),
    [audio, setAudio] = useState("");
  const { rows: comments, reload } = useRows<{
    id: string;
    post_id: string;
    text: string;
    audio_url: string;
  }>("post_comments");
  const { rows: reactions, reload: reloadReactions } = useRows<{
    id: string;
    post_id: string;
    reaction: string;
    user_id: string;
  }>("post_reactions");
  return (
    <article className="card p-5 grid gap-3">
      <p className="text-sm text-muted">
        {p.author_name || t("anonymousName")}
      </p>
      <h2 className="font-bold text-2xl">{p.title}</h2>
      <p className="whitespace-pre-wrap">{p.text || p.transcript}</p>
      {p.audio_url && <PrivateAudio path={p.audio_url} />}
      {p.image_urls.map((url) => (
        <img
          src={url}
          key={url}
          alt={p.image_alt || p.title}
          className="max-h-96 w-full object-contain rounded-2xl"
        />
      ))}
      <ReadAloudButton text={[p.title, p.text || p.transcript]} />
      {options
        ?.features("stories")
        .some((f) => f.key === "story_reactions") && (
        <div className="flex flex-wrap gap-2">
          {["❤️", "🙏", "💪", "👏"].map((reaction) => (
            <button
              key={reaction}
              className="min-h-14 min-w-14 rounded-2xl bg-soft px-2"
              aria-pressed={reactions.some(
                (r) =>
                  r.post_id === p.id &&
                  r.user_id === profile!.id &&
                  r.reaction === reaction,
              )}
              onClick={async () => {
                const r = await supabase
                  .from("post_reactions")
                  .upsert(
                    { post_id: p.id, user_id: profile!.id, reaction },
                    { onConflict: "post_id,user_id" },
                  );
                if (r.error) toast(r.error.message, "error");
                else void reloadReactions();
              }}
            >
              {reaction}{" "}
              {
                reactions.filter(
                  (r) => r.post_id === p.id && r.reaction === reaction,
                ).length
              }
            </button>
          ))}
        </div>
      )}
      <ReportButton type="post" id={p.id} />
      {options?.features("stories").some((f) => f.key === "story_comments") && (
        <details>
          <summary className="min-h-12">{t("postComments")}</summary>
          {comments
            .filter((c) => c.post_id === p.id)
            .map((c) => (
              <div className="bg-soft rounded-xl p-3 mb-2" key={c.id}>
                <p>{c.text}</p>
                {c.audio_url && <PrivateAudio path={c.audio_url} />}
                <ReportButton type="comment" id={c.id} />
              </div>
            ))}
          <Field label={t("addComment")}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <VoiceInput onSubmit={setComment} />
          <VoiceClip value={audio} onChange={setAudio} />
          <BigButton
            label={t("send")}
            onClick={async () => {
              if (!comment.trim()) return;
              const r = await supabase
                .from("post_comments")
                .insert({ post_id: p.id, text: comment, audio_url: audio });
              if (r.error) toast(r.error.message, "error");
              else {
                setComment("");
                setAudio("");
                toast(t("postPending"), "success");
                void reload();
              }
            }}
          />
        </details>
      )}
    </article>
  );
}
