import type { TFn } from "../../../lib/i18n";
import type { WcCondition, WcDuration, WcOffer, WcStatus, WcType, ReqReason } from "../../../lib/types";

export const WC_TYPES: WcType[] = ["manual", "foldable", "electric", "commode", "walker", "crutches", "hospital_bed"];
export const WC_CONDITIONS: WcCondition[] = ["like_new", "good", "usable"];
export const WC_OFFERS: WcOffer[] = ["free_lend", "rent", "donate"];
export const WC_DURATIONS: WcDuration[] = ["1w", "1m", "any"];
export const REASONS: ReqReason[] = ["surgery", "elderly", "disability", "palliative", "other"];
export const TYPE_ICON: Record<WcType, string> = { manual: "♿", foldable: "🦽", electric: "🦼", commode: "🚽", walker: "🚶", crutches: "🩼", hospital_bed: "🛏️" };

export const wcType = (t: TFn, v: WcType) => t(`t_${v}` as const);
export const wcCond = (t: TFn, v: WcCondition) => t(`c_${v}` as const);
export const wcOffer = (t: TFn, v: WcOffer) => t(`o_${v}` as const);
export const wcDur = (t: TFn, v: WcDuration) => t(`d_${v}` as const);
export const wcStatus = (t: TFn, v: WcStatus) => t(`st_${v}` as const);
export const reqReason = (t: TFn, v: ReqReason) => t(`r_${v}` as const);
export const reqStatus = (t: TFn, v: string) => t(`rs_${v}` as "rs_pending");
