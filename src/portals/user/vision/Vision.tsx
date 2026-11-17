import { useSearchParams } from "react-router-dom";
import { useUserSettings } from "../../../hooks/useUserSettings";
import { useI18n } from "../../../lib/i18n";
import { Empty, PageHeader, Tabs } from "../../../components/ui/Bits";
import { OcrTab } from "./OcrTab";
import { NoteTab } from "./NoteTab";
import { ObjectsTab } from "./ObjectsTab";
import { LightTab } from "./LightTab";

type Tab = "ocr" | "note" | "objects" | "light";

/** Only the sub-features the user (and admin) enabled are shown as tabs. */
export default function Vision() {
  const { t } = useI18n();
  const { features } = useUserSettings();
  const [params, setParams] = useSearchParams();
  const on = features("vision").map((f) => f.key);
  const all: { key: Tab; label: string }[] = [
    { key: "ocr", label: t("tabOcr") }, { key: "note", label: t("tabNote") },
    { key: "objects", label: t("tabObjects") }, { key: "light", label: t("tabLight") },
  ];
  const tabs = all.filter((x) => on.includes(x.key));
  const tab = tabs.find((x) => x.key === params.get("tab"))?.key ?? tabs[0]?.key;
  return (
    <div>
      <PageHeader title={t("visionTitle")} help={t("visionHelp")} icon="👁️" />
      {tabs.length === 0 ? <Empty text={t("noModules")} /> : (
        <>
          {tabs.length > 1 && <Tabs items={tabs} value={tab!} onChange={(k) => setParams({ tab: k }, { replace: true })} />}
          {tab === "ocr" && <OcrTab />}
          {tab === "note" && <NoteTab />}
          {tab === "objects" && <ObjectsTab />}
          {tab === "light" && <LightTab />}
        </>
      )}
    </div>
  );
}
