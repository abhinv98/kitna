import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import CameraOverlay from "@/components/CameraOverlay";
import { detectObjects, getDetector, type ScanDetection } from "@/lib/scan";
import type { AppraisalSession } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScanSearch,
  AlertTriangle,
} from "lucide-react";

type ScanStatus = "loading-model" | "scanning" | "found" | "maybe" | "not-found" | "error";

interface ScanScreenProps {
  session: AppraisalSession;
  /** Continue to analysis. The scan only frames the crop — the AI identifies the item from the photo alone. */
  onComplete: () => void;
  /** Go back to the capture screen to retake the photo. */
  onBack: () => void;
}

const AUTO_CONTINUE_DELAY = 1600; // ms before auto-advancing on a confident find
const MIN_SCAN_DURATION = 700; // ms — keep the scan line visible long enough to feel alive

export default function ScanScreen({ session, onComplete, onBack }: ScanScreenProps) {
  const [status, setStatus] = useState<ScanStatus>("loading-model");
  const [detections, setDetections] = useState<ScanDetection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const top = detections[0] ?? null;
  const highlightIndex = top ? 0 : -1;

  const runScan = useCallback(async () => {
    setDetections([]);
    setError(null);
    setStatus("loading-model");

    try {
      const detector = await getDetector();
      if (!mountedRef.current) return;

      setStatus("scanning");
      const started = Date.now();
      const preds = await detectObjects(detector, session.image);

      // Keep the scan animation on screen for at least MIN_SCAN_DURATION.
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SCAN_DURATION) {
        await new Promise((r) => setTimeout(r, MIN_SCAN_DURATION - elapsed));
      }
      if (!mountedRef.current) return;

      setDetections(preds);
      const first = preds[0];
      if (first && first.score >= 0.6) setStatus("found");
      else if (first) setStatus("maybe");
      else setStatus("not-found");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Something went wrong starting the scanner.",
      );
      setStatus("error");
    }
  }, [session.image]);

  // Kick off the scan on mount.
  useEffect(() => {
    mountedRef.current = true;
    runScan();
    return () => {
      mountedRef.current = false;
    };
  }, [runScan]);

  // Auto-continue when a confident object is found.
  useEffect(() => {
    if (status !== "found" || !top) return;
    const t = setTimeout(() => onCompleteRef.current(), AUTO_CONTINUE_DELAY);
    return () => clearTimeout(t);
  }, [status, top]);

  const handleSkip = useCallback(() => onCompleteRef.current(), []);
  const handleContinue = useCallback(() => onCompleteRef.current(), []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <div className="w-full max-w-lg mx-auto space-y-6 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to retake photo"
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
              Scan your item
            </p>
            <p className="text-xs text-foreground/35 mt-1">
              We&rsquo;ll detect what you&rsquo;re selling
            </p>
          </div>
          <div className="w-10 shrink-0" aria-hidden="true" />
        </div>

        {/* Viewfinder with bounding boxes */}
        <Card className="overflow-hidden shadow-card">
          <AspectRatio ratio={16 / 9}>
            <CameraOverlay
              imageSrc={session.image}
              detections={detections}
              highlightIndex={highlightIndex}
              scanning={status === "scanning"}
            />
          </AspectRatio>
        </Card>

        {/* Status panel — live announcements for screen readers */}
        <div role="status" aria-live="polite" className="space-y-4">
          {status === "loading-model" && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <p className="text-sm text-foreground/60">Warming up the AI scanner&hellip;</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSkip} className="w-full">
                Skip scan and continue
              </Button>
            </div>
          )}

          {status === "scanning" && (
            <div className="text-center space-y-4">
              <p className="text-sm text-foreground/60">Looking for your item&hellip;</p>
              <Button variant="ghost" size="sm" onClick={handleSkip} className="w-full">
                Skip scan and continue
              </Button>
            </div>
          )}

          {status === "found" && top && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm font-semibold text-foreground">Found it</p>
              </div>

              {/* Auto-continue countdown */}
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-scan-fill motion-reduce:animate-none" />
              </div>
              <p className="text-xs text-foreground/40">
                Continuing automatically&hellip;
              </p>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleContinue}>
                  Continue now
                </Button>
                <Button variant="outline" size="sm" onClick={runScan}>
                  <RefreshCw className="w-4 h-4" />
                  Re-scan
                </Button>
              </div>
              <Button variant="link" size="sm" onClick={handleSkip}>
                Skip scan
              </Button>
            </div>
          )}

          {status === "maybe" && top && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-4 space-y-4 text-center">
              <p className="text-sm font-semibold text-foreground">
                Got your item in frame
              </p>
              <p className="text-xs text-foreground/40">
                Ready to appraise this?
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleContinue}>
                  Appraise this
                </Button>
                <Button variant="outline" size="sm" onClick={runScan}>
                  <RefreshCw className="w-4 h-4" />
                  Re-scan
                </Button>
              </div>
              <Button variant="link" size="sm" onClick={handleSkip}>
                Skip scan
              </Button>
            </div>
          )}

          {status === "not-found" && (
            <div className="rounded-xl border border-border bg-white px-4 py-4 space-y-4 text-center shadow-card">
              <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ScanSearch className="w-5 h-5 text-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Couldn&rsquo;t spot the item clearly
                </p>
                <p className="text-xs text-foreground/50">
                  No problem &mdash; our AI will still take a close look at your photo.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={runScan}>
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={handleSkip}>
                  Continue anyway
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-800">
                    The scanner couldn&rsquo;t start
                  </p>
                  <p className="text-xs text-red-700/80 leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="flex-1" onClick={handleSkip}>
                  Continue anyway
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={runScan}>
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
