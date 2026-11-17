// Types matching supabase/schema.sql
export type Role = "user" | "family" | "admin" | "volunteer" | "gov_admin";
export type Mode = "vision" | "hearing" | "mobility" | "simple";
export type Lang = "ml" | "en";
export type LinkLevel = "view" | "assist" | "full";

export interface Profile {
  is_volunteer?: boolean;
  id: string;
  name: string;
  phone: string | null;
  whatsapp: boolean;
  role: Role;
  modes: Mode[];
  avatar_url: string | null;
  verified: boolean;
  blocked: boolean;
  last_seen: string | null;
  created_at: string;
}
export interface PublicProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  verified: boolean;
  role: Role;
}

export interface ModuleRow {
  id: number;
  key: string;
  label_ml: string;
  label_en: string;
  icon: string;
  color: string;
  default_order: number;
  enabled_globally: boolean;
  link_url: string | null;
}
export interface SubFeature {
  id: number;
  module_key: string;
  key: string;
  label_ml: string;
  label_en: string;
  enabled_globally: boolean;
}
export interface UserSettings {
  custom_labels?: Record<string, string>;
  custom_icons?: Record<string, string>;
  user_id: string;
  enabled_modules: string[];
  enabled_features: string[];
  module_order: string[];
  text_size: "large" | "xl";
  high_contrast: boolean;
  voice_on: boolean;
  voice_rate: number;
  vibration: boolean;
  sound_alert_sensitivity: number;
  language: Lang;
  onboarded: boolean;
  updated_at: string;
  updated_by: string | null;
}
export interface FamilyLink {
  id: string;
  user_id: string;
  family_id: string | null;
  level: LinkLevel;
  status: "pending" | "active" | "revoked";
  link_code: string;
  created_at: string;
}
export interface ActivityLog {
  id: number;
  user_id: string;
  changed_by: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
export interface Medicine {
  stock_count?: number | null;
  dose_per_time?: number;
  low_stock_threshold?: number;
  id: string;
  user_id: string;
  name: string;
  times: string[];
  photo_url: string | null;
  notes: string | null;
  added_by: string | null;
  needs_confirmation: boolean;
  active: boolean;
  created_at: string;
}
export interface MedLog {
  id: string;
  medicine_id: string;
  user_id: string;
  scheduled_for: string;
  taken_at: string | null;
}
export interface Task {
  id: string;
  user_id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  added_by: string | null;
  needs_confirmation: boolean;
  created_at: string;
}
export interface MemoryNote {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}
export interface Contact {
  category?: string;
  speciality?: string;
  address?: string;
  notes?: string;
  is_favourite?: boolean;
  id: string;
  user_id: string;
  name: string;
  relation: string | null;
  phone: string;
  whatsapp: boolean;
  photo_url: string | null;
  is_sos: boolean;
  needs_confirmation: boolean;
  added_by: string | null;
}
export interface EmergencyInfo {
  user_id: string;
  blood_group: string | null;
  allergies: string | null;
  conditions: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  note: string | null;
}
export interface Checkin {
  id: string;
  user_id: string;
  created_at: string;
}
export interface CheckinRule {
  user_id: string;
  deadline_time: string;
}
export interface SosEvent {
  id: string;
  user_id: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}
export interface SignCard {
  id: string;
  image_url: string;
  meaning_ml: string;
  meaning_en: string;
  category: string;
  created_by: string | null;
}
export interface QuickPhrase {
  id: string;
  text_ml: string;
  text_en: string | null;
  icon: string | null;
  user_id: string | null;
}
export interface Helpline {
  id: string;
  name_ml: string;
  name_en: string | null;
  phone: string;
  category: string | null;
}

export type WcType =
  | "manual"
  | "foldable"
  | "electric"
  | "commode"
  | "walker"
  | "crutches"
  | "hospital_bed";
export type WcCondition = "like_new" | "good" | "usable";
export type WcOffer = "free_lend" | "rent" | "donate";
export type WcDuration = "1w" | "1m" | "any";
export type WcStatus = "available" | "requested" | "in_use";
export interface Wheelchair {
  id: string;
  owner_id: string;
  photo_urls: string[];
  type: WcType;
  condition: WcCondition;
  offer: WcOffer;
  rent_per_day: number | null;
  duration: WcDuration;
  lat: number;
  lng: number;
  public_lat: number;
  public_lng: number;
  place_name: string | null;
  delivery: boolean;
  status: WcStatus;
  approved: boolean;
  is_demo: boolean;
  created_at: string;
}
/** Row of the wheelchairs_public view — no exact location, no phone. */
export interface WheelchairPublic {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_verified: boolean;
  photo_urls: string[];
  type: WcType;
  condition: WcCondition;
  offer: WcOffer;
  rent_per_day: number | null;
  duration: WcDuration;
  public_lat: number;
  public_lng: number;
  place_name: string | null;
  delivery: boolean;
  status: WcStatus;
  is_demo: boolean;
  created_at: string;
}
export type ReqReason =
  "surgery" | "elderly" | "disability" | "palliative" | "other";
export interface WheelchairRequest {
  id: string;
  wheelchair_id: string;
  seeker_id: string;
  reason: ReqReason;
  days_needed: number;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "returned" | "cancelled";
  return_date: string | null;
  created_at: string;
}
export interface Report {
  id: string;
  item_type: string;
  item_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
}
export interface Message {
  id: string;
  from_id: string;
  to_id: string;
  text: string | null;
  audio_url: string | null;
  read: boolean;
  created_at: string;
}
export interface ContactReveal {
  phone: string | null;
  whatsapp: boolean;
  lat: number | null;
  lng: number | null;
  name: string | null;
}
