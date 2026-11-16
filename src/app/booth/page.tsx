"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConfigGuard } from "@/components/ui/ConfigGuard";
import { Snow } from "@/components/ui/Snow";
import { Button } from "@/components/ui/Button";
import { CameraCapture, type CapturedShot } from "@/components/camera/CameraCapture";
import { StandbyScreen } from "@/components/booth/StandbyScreen";
import { DesignSelect } from "@/components/booth/DesignSelect";
import { PhotoSelect, useShotImages } from "@/components/booth/PhotoSelect";
import { ResultScreen } from "@/components/booth/ResultScreen";
import { SessionTimer } from "@/components/booth/SessionTimer";
import { CameraSettings } from "@/components/booth/CameraSettings";
import { useCountdown } from "@/hooks/useCountdown";
import { useNow } from "@/hooks/useNow";
import { abortSession, BoothError, newSessionId, recoverInterruptedSession, redeemTicket } from "@/lib/booth";
import { buildArtifacts, publishArtifacts, type Artifacts } from "@/lib/finalize";
import { BRAND, PICK_COUNT, TOTAL_SHOTS } from "@/lib/constants";
import { getTemplate, slotAspect, templatesFor } from "@/lib/templates";
import type { FilterId, Orientation, Ticket } from "@/lib/types";

type Stage = "standby" | "design" | "camera" | "select" | "finalizing" | "result";

interface State {
  stage: Stage;
  ticket: Ticket | null;
  endsAt: number | null;
  orientation: Orientation;
  templateId: string | null;
  shots: CapturedShot[];
  selected: string[];
  filter: FilterId;
  finalizeStatus: "build" | "upload" | "error";
  finalizeError: string | null;
  result: { sheetUrl: string; downloadUrl: string; copies: number; paperRemaining: number } | null;
  notice: string | null;
}

const initial: State = {
  stage: "standby", ticket: null, endsAt: null, orientation: "PORTRAIT", templateId: "noel-strip",
  shots: [], selected: [], filter: "original", finalizeStatus: "build", finalizeError: null, result: null, notice: null,
};

type Action =
  | { type: "START"; ticket: Ticket; endsAt: number }
  | { type: "ORIENTATION"; o: Orientation }
  | { type: "TEMPLATE"; id: string }
  | { type: "TO_CAMERA" }
  | { type: "SHOTS"; shots: CapturedShot[] }
  | { type: "TOGGLE"; id: string }
  | { type: "SET_SELECTED"; ids: string[] }
  | { type: "FILTER"; f: FilterId }
  | { type: "FINALIZING"; status: "build" | "upload" }
  | { type: "FINALIZE_ERROR"; message: string }
  | { type: "RESULT"; result: NonNullable<State["result"]> }
  | { type: "RESET"; notice?: string | null };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "START": return { ...initial, stage: "design", ticket: a.ticket, endsAt: a.endsAt };
    case "ORIENTATION": return { ...s, orientation: a.o, templateId: templatesFor(a.o)[0]?.id ?? null };
    case "TEMPLATE": return { ...s, templateId: a.id };
    case "TO_CAMERA": return { ...s, stage: "camera" };
    case "SHOTS": return { ...s, stage: "select", shots: a.shots, selected: [] };
    case "TOGGLE":
      return s.selected.includes(a.id)
        ? { ...s, selected: s.selected.filter((x) => x !== a.id) }
        : s.selected.length >= PICK_COUNT ? s : { ...s, selected: [...s.selected, a.id] };
    case "SET_SELECTED": return { ...s, selected: a.ids };
    case "FILTER": return { ...s, filter: a.f };
    case "FINALIZING": return { ...s, stage: "finalizing", finalizeStatus: a.status, finalizeError: null };
    case "FINALIZE_ERROR": return { ...s, finalizeStatus: "error", finalizeError: a.message };
    case "RESULT": return { ...s, stage: "result", result: a.result };
    case "RESET": return { ...initial, notice: a.notice ?? null };
  }
}

const errMsg = (e: unknown) => (e instanceof BoothError ? e.message : (e as Error)?.message || "Terjadi kesalahan.");

function BoothApp() {
  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | undefined>();
  const now = useNow(10_000);

  const template = state.templateId ? getTemplate(state.templateId) ?? null : null;
  const images = useShotImages(state.shots);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const artifactsRef = useRef<Artifacts | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  /** Lepas semua object URL + cache hasil, lalu kembali ke standby */
  const resetAll = useCallback((notice?: string | null) => {
    const s = stateRef.current;
    s.shots.forEach((x) => URL.revokeObjectURL(x.url));
    if (s.result) URL.revokeObjectURL(s.result.sheetUrl);
    artifactsRef.current = null;
    sessionIdRef.current = null;
    setError(null);
    dispatch({ type: "RESET", notice });
  }, []);

  // ---------------------------------------------------------------- 1) standby → redeem
  const handleTicket = useCallback(async (by: { ticketId: string } | { pin: string }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const norm = "ticketId" in by ? { ticketId: by.ticketId.replace(/^PBT:/i, "").trim() } : by;
      const { ticket, endsAt } = await redeemTicket(norm);
      dispatch({ type: "START", ticket, endsAt });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  // ---------------------------------------------------------------- 5) finalize: compose → upload → simpan
  const finalize = useCallback(async (ids: string[]) => {
    const s = stateRef.current;
    const tpl = s.templateId ? getTemplate(s.templateId) : null;
    if (!s.ticket || !tpl) return;
    try {
      if (!artifactsRef.current) {
        dispatch({ type: "FINALIZING", status: "build" });
        const imgs = ids.map((id) => imagesRef.current[id]);
        if (imgs.some((i) => !i)) throw new Error("Foto belum selesai dimuat.");
        artifactsRef.current = await buildArtifacts({ template: tpl, images: imgs, filter: s.filter });
      }
      dispatch({ type: "FINALIZING", status: "upload" });
      sessionIdRef.current ??= newSessionId();
      const res = await publishArtifacts({
        sessionId: sessionIdRef.current, ticket: s.ticket, template: tpl, filter: s.filter, artifacts: artifactsRef.current,
      });
      dispatch({
        type: "RESULT",
        result: {
          sheetUrl: URL.createObjectURL(artifactsRef.current.sheetBlob),
          downloadUrl: `${window.location.origin}/download/${sessionIdRef.current}`,
          copies: res.copies,
          paperRemaining: res.paperRemaining,
        },
      });
    } catch (e) {
      dispatch({ type: "FINALIZE_ERROR", message: errMsg(e) });
    }
  }, []);

  // ---------------------------------------------------------------- timer 4 menit
  const timerOn = state.stage === "design" || state.stage === "camera" || state.stage === "select";
  const onExpire = useCallback(async () => {
    const s = stateRef.current;
    if (s.stage === "select") {
      // isi otomatis sampai 4 foto lalu langsung cetak
      const ids = [...s.selected];
      for (const sh of s.shots) if (ids.length < PICK_COUNT && !ids.includes(sh.id)) ids.push(sh.id);
      dispatch({ type: "SET_SELECTED", ids });
      finalize(ids);
    } else if (s.stage === "design" || s.stage === "camera") {
      if (s.ticket) await abortSession(s.ticket.id).catch(() => {});
      resetAll("Waktu sesi habis. Scan tiket lagi untuk sesi berikutnya.");
    }
  }, [finalize, resetAll]);
  const secondsLeft = useCountdown(timerOn ? state.endsAt : null, onExpire);

  // refresh/mati listrik di tengah sesi → lepas bilik & kembalikan sesi tiket
  useEffect(() => {
    recoverInterruptedSession()
      .then((no) => {
        if (no !== null) dispatch({ type: "RESET", notice: `Sesi tiket #${String(no).padStart(3, "0")} terputus dan dikembalikan. Scan ulang untuk melanjutkan.` });
      })
      .catch(() => {});
  }, []);

  // peringatan sebelum menutup tab di tengah sesi
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (stateRef.current.stage !== "standby") e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  // ---------------------------------------------------------------- render
  const stage = state.stage;
  const clock = useMemo(() => new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), [now]);

  return (
    <div className="kiosk fixed inset-0 flex flex-col overflow-hidden bg-pine-950 text-cream-50">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(63,107,82,.35),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(184,58,53,.12),transparent_55%)]" />
      <Snow />

      {/* ---------- header ---------- */}
      <header className="relative z-10 flex h-[76px] shrink-0 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <span className="font-serif text-2xl font-bold uppercase tracking-[0.25em]">{BRAND}</span>
          <span className="hidden font-script text-2xl text-gold-400 sm:inline">Merry Christmas</span>
        </div>
        {stage === "standby" ? (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-cream-50/70"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Bilik siap · {clock}</span>
            <CameraSettings onChange={setCameraId} />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {state.ticket && (
              <span className="hidden text-sm text-cream-50/70 md:inline">
                Tiket #{String(state.ticket.queue_no).padStart(3, "0")} · sisa {state.ticket.remaining_sessions} sesi
              </span>
            )}
            {timerOn && <SessionTimer seconds={secondsLeft} />}
          </div>
        )}
      </header>

      {state.notice && stage === "standby" && (
        <div className="relative z-10 mx-auto mb-2 rounded-full bg-gold-400/15 px-6 py-2 text-gold-300 ring-1 ring-gold-400/40">{state.notice}</div>
      )}

      {/* ---------- konten ---------- */}
      <main className="relative z-10 min-h-0 flex-1">
        {stage === "standby" && <StandbyScreen onTicket={handleTicket} busy={busy} error={error} cameraId={cameraId} />}

        {stage === "design" && (
          <DesignSelect
            orientation={state.orientation}
            templateId={state.templateId}
            onOrientation={(o) => dispatch({ type: "ORIENTATION", o })}
            onTemplate={(t) => dispatch({ type: "TEMPLATE", id: t.id })}
            onConfirm={() => dispatch({ type: "TO_CAMERA" })}
          />
        )}

        {stage === "camera" && template && (
          <div className="mx-auto flex h-full max-w-[1500px] flex-col px-6 pb-5">
            <CameraCapture
              aspectRatio={slotAspect(template)}
              totalShots={TOTAL_SHOTS}
              deviceId={cameraId}
              onComplete={(shots) => dispatch({ type: "SHOTS", shots })}
            />
          </div>
        )}

        {stage === "select" && template && (
          <PhotoSelect
            shots={state.shots}
            template={template}
            selected={state.selected}
            filter={state.filter}
            images={images}
            onToggle={(id) => dispatch({ type: "TOGGLE", id })}
            onFilter={(f) => dispatch({ type: "FILTER", f })}
            onConfirm={() => finalize(state.selected)}
          />
        )}

        {stage === "finalizing" && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            {state.finalizeStatus !== "error" ? (
              <>
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-cream-50/20 border-t-gold-400" />
                <h1 className="font-serif text-5xl font-bold">
                  {state.finalizeStatus === "build" ? "Menyusun fotomu…" : "Menyimpan & menyiapkan cetak…"}
                </h1>
                <p className="text-cream-50/60">Mohon tunggu sebentar</p>
              </>
            ) : (
              <>
                <h1 className="font-serif text-4xl font-bold text-berry-400">Gagal menyimpan hasil</h1>
                <p className="max-w-lg text-cream-50/70">{state.finalizeError}</p>
                <div className="flex gap-3">
                  <Button variant="gold" size="lg" onClick={() => finalize(state.selected)}>Coba lagi</Button>
                </div>
              </>
            )}
          </div>
        )}

        {stage === "result" && state.result && template && state.ticket && (
          <ResultScreen
            sheetUrl={state.result.sheetUrl}
            downloadUrl={state.result.downloadUrl}
            copies={state.result.copies}
            orientation={template.orientation}
            paperRemaining={state.result.paperRemaining}
            remainingSessions={state.ticket.remaining_sessions}
            onDone={() => resetAll()}
          />
        )}
      </main>
    </div>
  );
}

export default function BoothPage() {
  return (
    <ConfigGuard>
      <BoothApp />
    </ConfigGuard>
  );
}
