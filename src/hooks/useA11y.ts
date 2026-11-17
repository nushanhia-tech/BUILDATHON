import { useAuth } from "../auth/AuthProvider";
import { useOptionalUserSettings } from "./useUserSettings";

/** Accessibility modes for the current user (only meaningful in the User Portal). */
export function useA11y() {
  const { profile } = useAuth();
  const s = useOptionalUserSettings();
  const modes = profile?.role === "user" ? profile.modes ?? [] : [];
  return {
    vision: modes.includes("vision"),
    hearing: modes.includes("hearing"),
    mobility: modes.includes("mobility"),
    simple: modes.includes("simple"),
    voiceOn: s?.settings?.voice_on ?? true,
    vibrationOn: s?.settings?.vibration ?? true,
  };
}
