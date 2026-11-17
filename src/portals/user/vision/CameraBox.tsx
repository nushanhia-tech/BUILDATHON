import type { RefObject } from "react";
import { useI18n } from "../../../lib/i18n";
import { BigButton } from "../../../components/ui/BigButton";
import { Icon } from "../../../components/ui/Icon";

/** Live camera preview with start/stop. The stream itself is owned by useCamera(). */
export function CameraBox({ videoRef, active, error, onStart, onStop, overlay }: {
  videoRef: RefObject<HTMLVideoElement | null>; active: boolean; error: string | null; onStart: () => void; onStop: () => void; overlay?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full aspect-[3/4] sm:aspect-video bg-black rounded-3xl overflow-hidden">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" aria-hidden="true" />
        {!active && <div className="absolute inset-0 grid place-items-center text-white text-6xl" aria-hidden="true"><Icon name="camera" size={48} /></div>}
        {overlay}
      </div>
      {error && <p className="text-danger font-semibold">{t("cameraError")}</p>}
      {active ? <BigButton variant="danger" label={t("stopCamera")} onClick={onStop} /> : <BigButton label={t("startCamera")} onClick={onStart} />}
    </div>
  );
}
