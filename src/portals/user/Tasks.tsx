import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useI18n } from "../../lib/i18n";
import { Empty, PageHeader, Tabs } from "../../components/ui/Bits";
import { MemoryNotes, TasksManager } from "../../components/managers/TasksManager";

type Tab = "tasks" | "where_kept";

export default function Tasks() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { features } = useUserSettings();
  const [params, setParams] = useSearchParams();
  const on = features("tasks").map((f) => f.key);
  const tabs = ([{ key: "tasks", label: t("tasksTab") }, { key: "where_kept", label: t("whereTab") }] as { key: Tab; label: string }[]).filter((x) => on.includes(x.key));
  const tab = tabs.find((x) => x.key === params.get("tab"))?.key ?? tabs[0]?.key;
  return (
    <div>
      <PageHeader title={t("tasksTitle")} help={t("tasksHelp")} icon="📋" />
      {tabs.length === 0 ? <Empty text={t("noModules")} /> : (
        <>
          {tabs.length > 1 && <Tabs items={tabs} value={tab!} onChange={(k) => setParams({ tab: k }, { replace: true })} />}
          {tab === "tasks" && <TasksManager userId={profile!.id} actor="user" />}
          {tab === "where_kept" && <MemoryNotes userId={profile!.id} />}
        </>
      )}
    </div>
  );
}
