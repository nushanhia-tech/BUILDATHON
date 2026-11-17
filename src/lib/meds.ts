import type { MedLog, Medicine } from "./types";
import { atTime, slotOf } from "./time";

export interface Dose {
  medicine: Medicine; time: string; scheduled: Date; slot: "morning" | "afternoon" | "night";
  taken: boolean; status: "taken" | "missed" | "due" | "upcoming";
}

/** Expand medicines into today's doses with taken/missed/due status. */
export function dosesFor(meds: Medicine[], logs: MedLog[], day = new Date(), now = new Date()): Dose[] {
  const out: Dose[] = [];
  for (const m of meds) {
    if (!m.active || m.needs_confirmation) continue;
    for (const time of m.times) {
      const scheduled = atTime(time, day);
      const taken = logs.some((l) => l.medicine_id === m.id && Math.abs(new Date(l.scheduled_for).getTime() - scheduled.getTime()) < 60000 && l.taken_at);
      const diffMin = (now.getTime() - scheduled.getTime()) / 60000;
      const status = taken ? "taken" : diffMin > 30 ? "missed" : diffMin >= 0 ? "due" : "upcoming";
      out.push({ medicine: m, time, scheduled, slot: slotOf(time), taken, status });
    }
  }
  return out.sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime());
}

export const TIME_CHIPS = [
  { key: "morning", time: "08:00" },
  { key: "afternoon", time: "14:00" },
  { key: "night", time: "21:00" },
] as const;
