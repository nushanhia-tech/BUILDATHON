import { useSearchParams } from "react-router-dom";
import { useUserSettings } from "../../../hooks/useUserSettings";
import { useI18n } from "../../../lib/i18n";
import { PageHeader, Tabs, Empty } from "../../../components/ui/Bits";
import { TalkBridge } from "./TalkBridge";
import { SoundAlert } from "./SoundAlert";
import { SignCards } from "./SignCards";

type Tab = "talk" | "alert" | "signs";
const FEATURE: Record<Tab, string> = { talk: "talk_bridge", alert: "sound_alert", signs: "sign_cards" };

export default function Hearing() {
  const { t } = useI18n();
  const { features } = useUserSettings();
  const [params, setParams] = useSearchParams();
  const on = features("hearing").map((f) => f.key);
  const all: { key: Tab; label: string }[] = [
    { key: "talk", label: t("tabTalk") }, { key: "alert", label: t("tabAlert") }, { key: "signs", label: t("tabSigns") },
  ];
  const tabs = all.filter((x) => on.includes(FEATURE[x.key]));
  const tab = tabs.find((x) => x.key === params.get("tab"))?.key ?? tabs[0]?.key;
  return (
    <div>
      <PageHeader title={t("hearingTitle")} help={t("hearingHelp")} icon="🦻" />
      {tabs.length === 0 ? <Empty text={t("noModules")} /> : (
        <>
          {tabs.length > 1 && <Tabs items={tabs} value={tab!} onChange={(k) => setParams({ tab: k }, { replace: true })} />}
          {tab === "talk" && <TalkBridge />}
          {tab === "alert" && <SoundAlert />}
          {tab === "signs" && <SignCards />}
        </>
      )}
    </div>
  );
}
