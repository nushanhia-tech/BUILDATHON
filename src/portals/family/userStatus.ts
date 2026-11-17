import { supabase } from "../../lib/supabase";
import { dosesFor, type Dose } from "../../lib/meds";
import { atTime, endOfDay, startOfDay, todayStr } from "../../lib/time";
import type { Checkin, MedLog, Medicine, SosEvent, Task, WheelchairRequest } from "../../lib/types";

export interface UserStatus {
  checkin: Checkin | null; deadline: string; checkinOverdue: boolean;
  doses: Dose[]; taken: number; total: number; missed: Dose[];
  lastSos: SosEvent | null; sosToday: SosEvent[]; tasks: Task[];
  requests: WheelchairRequest[]; returnsDue: WheelchairRequest[];
}

/** Today's status for one linked user (only what RLS lets this family member read). */
export async function loadUserStatus(userId: string): Promise<UserStatus> {
  const s0 = startOfDay().toISOString(), s1 = endOfDay().toISOString();
  const [ci, rule, meds, logs, sos, tasks, reqs] = await Promise.all([
    supabase.from("checkins").select("*").eq("user_id", userId).gte("created_at", s0).order("created_at", { ascending: false }).limit(1),
    supabase.from("checkin_rules").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("medicines").select("*").eq("user_id", userId).eq("active", true),
    supabase.from("med_logs").select("*").eq("user_id", userId).gte("scheduled_for", s0).lte("scheduled_for", s1),
    supabase.from("sos_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("tasks").select("*").eq("user_id", userId).gte("due_at", s0).lte("due_at", s1).order("due_at"),
    supabase.from("wheelchair_requests").select("*").eq("seeker_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const deadline = (rule.data?.deadline_time as string) ?? "12:00";
  const checkin = ((ci.data ?? [])[0] as Checkin) ?? null;
  const doses = dosesFor((meds.data ?? []) as Medicine[], (logs.data ?? []) as MedLog[]);
  const relevant = doses.filter((d) => d.scheduled.getTime() <= Date.now() + 0);
  const sosAll = (sos.data ?? []) as SosEvent[];
  const requests = (reqs.data ?? []) as WheelchairRequest[];
  const soon = new Date(); soon.setDate(soon.getDate() + 1);
  return {
    checkin, deadline, checkinOverdue: !checkin && Date.now() > atTime(deadline).getTime(),
    doses, taken: relevant.filter((d) => d.taken).length, total: doses.length, missed: doses.filter((d) => d.status === "missed"),
    lastSos: sosAll[0] ?? null, sosToday: sosAll.filter((e) => e.created_at >= s0),
    tasks: (tasks.data ?? []) as Task[], requests,
    returnsDue: requests.filter((r) => r.status === "accepted" && r.return_date && r.return_date <= todayStr(soon)),
  };
}
