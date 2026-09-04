import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  Camera,
  MapPin,
  Loader2,
  ScanFace,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

/**
 * Shared document-upload and face/liveness capture primitives used by both the
 * India (SEBI / AMFI / CKYC) and Singapore (MAS / Singpass) onboarding journeys.
 *
 * Verification itself is SIMULATED — a licensed KRA / video-KYC provider (India)
 * or Singpass Face Verify / eKYC vendor (Singapore) plugs in at the marked
 * boundaries. Everything else — capture, liveness prompts, geo-tag, timestamp,
 * file validation and the audit trail — is real.
 */

// --------------------------------------------------------------- documents

export interface DocSlot {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
  accept?: string;
  /** Regulatory note shown under the slot. */
  note?: string;
}

export interface UploadedDoc {
  name: string;
  size: number;
  type: string;
  dataUrl: string | null; // preview for images only
  uploadedAt: string;
}

export type DocMap = Record<string, UploadedDoc>;

const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentSlots({
  slots,
  docs,
  onChange,
}: {
  slots: DocSlot[];
  docs: DocMap;
  onChange: (next: DocMap) => void;
}) {
  return (
    <div className="space-y-3">
      {slots.map((s) => (
        <DocumentSlotRow key={s.id} slot={s} doc={docs[s.id]} onChange={onChange} docs={docs} />
      ))}
    </div>
  );
}

function DocumentSlotRow({
  slot,
  doc,
  docs,
  onChange,
}: {
  slot: DocSlot;
  doc: UploadedDoc | undefined;
  docs: DocMap;
  onChange: (next: DocMap) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const accept = slot.accept ?? DEFAULT_ACCEPT;

  const handleFile = useCallback(
    (file: File) => {
      setError("");
      const allowed = accept.split(",").map((a) => a.trim());
      if (!allowed.includes(file.type)) {
        setError(`Unsupported file type — allowed: ${allowed.map((a) => a.split("/")[1]).join(", ")}`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`File is ${fmtSize(file.size)} — the limit is 5 MB`);
        return;
      }
      const finish = (dataUrl: string | null) => {
        onChange({
          ...docs,
          [slot.id]: {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
            uploadedAt: new Date().toISOString(),
          },
        });
      };
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => finish(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => setError("Could not read that file — try again");
        reader.readAsDataURL(file);
      } else {
        finish(null);
      }
    },
    [accept, docs, onChange, slot.id],
  );

  function remove() {
    const next = { ...docs };
    delete next[slot.id];
    onChange(next);
    setError("");
  }

  return (
    <div
      className={`rounded-md border p-3 transition-colors ${
        dragging ? "border-primary bg-primary/5" : doc ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {doc ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{slot.label}</span>
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                slot.required ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {slot.required ? "Required" : "Optional"}
            </span>
          </div>
          {slot.hint && <p className="text-xs text-muted-foreground mt-0.5">{slot.hint}</p>}

          {doc ? (
            <div className="mt-2 flex items-center gap-3">
              {doc.dataUrl ? (
                <img
                  src={doc.dataUrl}
                  alt={`Preview of ${slot.label}`}
                  className="w-14 h-14 object-cover rounded border border-border"
                />
              ) : (
                <div className="w-14 h-14 rounded border border-border flex items-center justify-center bg-muted">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 text-xs">
                <div className="truncate font-medium">{doc.name}</div>
                <div className="text-muted-foreground">
                  {fmtSize(doc.size)} · uploaded {new Date(doc.uploadedAt).toLocaleTimeString()}
                </div>
              </div>
              <button
                type="button"
                onClick={remove}
                className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-accent"
              >
                <X className="w-3 h-3" /> Replace
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 h-8 rounded-md border border-border hover:bg-accent"
              >
                <Upload className="w-3.5 h-3.5" /> Choose file
              </button>
              <span className="text-[11px] text-muted-foreground">or drag &amp; drop · max 5 MB</span>
            </div>
          )}

          {slot.note && <p className="text-[11px] text-muted-foreground mt-2">{slot.note}</p>}
          {error && (
            <p className="text-[11px] text-destructive mt-1.5 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function missingRequiredDocs(slots: DocSlot[], docs: DocMap): DocSlot[] {
  return slots.filter((s) => s.required && !docs[s.id]);
}

// ------------------------------------------------------------ face capture

export interface FaceCaptureResult {
  selfieDataUrl: string;
  frames: number;
  capturedAt: string;
  geo: { lat: number; lon: number; accuracy: number } | null;
  livenessScore: number;
  matchScore: number;
  challengeCode: string;
  prompts: string[];
}

const PROMPTS = [
  "Look straight into the camera",
  "Slowly turn your head to the left",
  "Slowly turn your head to the right",
  "Blink twice, then hold still",
];

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function FaceLivenessCapture({
  title = "Liveness & face match",
  subtitle,
  readAloud = false,
  result,
  onResult,
}: {
  title?: string;
  subtitle?: string;
  /** India video-IPV requires the client to read a random code aloud on record. */
  readAloud?: boolean;
  result: FaceCaptureResult | null;
  onResult: (r: FaceCaptureResult | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [geo, setGeo] = useState<FaceCaptureResult["geo"]>(null);
  const [code] = useState(randomCode);
  const [fallback, setFallback] = useState(false);
  const photoRef = useRef<HTMLInputElement | null>(null);

  function usePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That photo is ${fmtSize(file.size)} — the limit is 5 MB.`);
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) {
        setError("Could not read that photo — try another one.");
        return;
      }
      setVerifying(true);
      // ---- SIMULATED VERIFICATION BOUNDARY (uploaded-photo path) ---------
      setTimeout(() => {
        setVerifying(false);
        onResult({
          selfieDataUrl: dataUrl,
          frames: 1,
          capturedAt: new Date().toISOString(),
          geo,
          livenessScore: 0,
          matchScore: 90 + Math.floor(Math.random() * 6),
          challengeCode: code,
          prompts: ["Photo uploaded — no live liveness prompts; flagged for manual officer review"],
        });
      }, 1200);
    };
    reader.onerror = () => setError("Could not read that photo — try another one.");
    reader.readAsDataURL(file);
  }

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    setError("");
    setStarting(true);
    setFrames([]);
    setPromptIndex(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (first) {
        const n = (first as { name?: string })?.name;
        if (n === "NotAllowedError" || n === "SecurityError") throw first;
        // Retry with the loosest possible constraint — some devices reject
        // facingMode/resolution hints and report NotFoundError incorrectly.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setLive(true);
      // attach after render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) =>
            setGeo({
              lat: Number(p.coords.latitude.toFixed(5)),
              lon: Number(p.coords.longitude.toFixed(5)),
              accuracy: Math.round(p.coords.accuracy),
            }),
          () => setGeo(null),
          { timeout: 8000 },
        );
      }
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setFallback(true);
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera access was blocked. Allow the camera for this site in your browser settings (it also needs a secure https connection), then try again — or upload a photo instead."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No working camera was detected — it may be missing, switched off, or in use by another app (Zoom, Teams, another tab). Close those and retry, or upload a photo instead."
            : name === "NotSupportedError"
              ? "This browser does not allow camera access here. Try Chrome or Safari over https — or upload a photo instead."
              : "Could not start the camera on this device. You can retry or upload a photo instead.",
      );
    } finally {
      setStarting(false);
    }
  }

  function grabFrame(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  }

  function captureStep() {
    const frame = grabFrame();
    if (!frame) {
      setError("The camera is still warming up — try again in a moment.");
      return;
    }
    const nextFrames = [...frames, frame];
    setFrames(nextFrames);
    if (promptIndex < PROMPTS.length - 1) {
      setPromptIndex((i) => i + 1);
      return;
    }
    // ---- SIMULATED VERIFICATION BOUNDARY -------------------------------
    // Replace with the provider call (video-KYC engine / Singpass Face Verify).
    setVerifying(true);
    stop();
    setTimeout(() => {
      setVerifying(false);
      onResult({
        selfieDataUrl: nextFrames[0]!,
        frames: nextFrames.length,
        capturedAt: new Date().toISOString(),
        geo,
        livenessScore: 92 + Math.floor(Math.random() * 7),
        matchScore: 94 + Math.floor(Math.random() * 5),
        challengeCode: code,
        prompts: PROMPTS,
      });
    }, 1600);
  }

  function retake() {
    onResult(null);
    setFrames([]);
    setPromptIndex(0);
    void start();
  }

  if (result) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
        <div className="flex items-start gap-3">
          <img
            src={result.selfieDataUrl}
            alt="Captured verification selfie"
            className="w-20 h-20 rounded-md object-cover border border-border"
          />
          <div className="text-xs space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {result.livenessScore > 0 ? "Liveness passed · face matched" : "Photo received · pending officer review"}
            </div>
            <div className="text-muted-foreground">
              {result.livenessScore > 0
                ? `Liveness ${result.livenessScore}% · Face match ${result.matchScore}% · ${result.frames} frames`
                : `Uploaded photo · face match ${result.matchScore}% · no live liveness check`}
            </div>
            <div className="text-muted-foreground">
              Captured {new Date(result.capturedAt).toLocaleString()} · challenge code {result.challengeCode}
            </div>
            <div className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {result.geo
                ? `${result.geo.lat}, ${result.geo.lon} (±${result.geo.accuracy} m)`
                : "Location not shared — record flagged for manual review"}
            </div>
          </div>
          <button
            type="button"
            onClick={retake}
            className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-accent"
          >
            <RefreshCw className="w-3 h-3" /> Retake
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Match score is simulated in this demo; the capture, prompts, geo-tag and timestamp are real and form the audit record.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <ScanFace className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}

      {live && (
        <div className="space-y-2">
          <div className="relative w-full max-w-sm mx-auto aspect-[4/3] rounded-md overflow-hidden bg-black">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 border-[3px] border-primary/50 rounded-md pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-2 py-1.5 text-center">
              Step {promptIndex + 1} of {PROMPTS.length} — {PROMPTS[promptIndex]}
            </div>
          </div>
          {readAloud && (
            <p className="text-xs text-center text-muted-foreground">
              Read this code aloud on camera: <span className="font-mono font-semibold text-foreground">{code}</span>
            </p>
          )}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={captureStep}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Camera className="w-4 h-4" />
              {promptIndex === PROMPTS.length - 1 ? "Capture & verify" : "Capture step"}
            </button>
          </div>
        </div>
      )}

      {verifying && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Running liveness and face-match checks…
        </div>
      )}

      {!live && !verifying && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {fallback ? "Retry camera" : "Start camera"}
          </button>
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border border-border hover:bg-accent"
          >
            <Upload className="w-4 h-4" /> Upload a photo instead
          </button>
          <span className="text-[11px] text-muted-foreground">
            {PROMPTS.length} guided prompts · session is time-stamped and geo-tagged
          </span>
        </div>
      )}

      <input
        ref={photoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) usePhoto(f);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="text-xs text-destructive flex items-start gap-1">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
