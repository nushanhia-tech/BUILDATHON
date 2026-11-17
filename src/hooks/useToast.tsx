import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Kind = "info" | "success" | "error";
interface Toast { id: number; text: string; kind: Kind; }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed top-3 inset-x-3 z-[1000] flex flex-col items-center gap-2 pointer-events-none" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-lg w-full card px-5 py-4 font-semibold border-l-8 ${
              t.kind === "error" ? "border-danger text-danger" : t.kind === "success" ? "border-success" : "border-primary"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Turn any thrown value into a message. */
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
