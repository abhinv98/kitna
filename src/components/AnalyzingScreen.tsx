import { useState, useEffect, useCallback } from "react";
import type { AppraisalSession, AppraisalResult } from "@/lib/types";
import { DEMO_RESULTS, DEMO_TIMING } from "@/lib/demo-data";
import type { ExampleObject } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatINR } from "@/lib/currency";
import { appraiseItem } from "@/lib/appraise";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface AnalyzingScreenProps {
  session: AppraisalSession;
  onComplete: (result: AppraisalResult) => void;
}

type Phase = "identifying" | "condition" | "pricing" | "done";

const PHASE_ORDER: Phase[] = ["identifying", "condition", "pricing", "done"];

export default function AnalyzingScreen({
  session,
  onComplete,
}: AnalyzingScreenProps) {
  const [phase, setPhase] = useState<Phase>("identifying");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Simulate progressive analysis — demo branch (kept intact)
  useEffect(() => {
    if (!session.isDemo || !session.demoObject) return;

    const demoObj = session.demoObject as ExampleObject;
    const baseResult = DEMO_RESULTS[demoObj];
    if (!baseResult) return;

    const filled: AppraisalResult = {
      ...baseResult,
      image: session.image,
    };

    const t1 = setTimeout(() => {
      setPhase("condition");
    }, DEMO_TIMING.itemName);

    const t2 = setTimeout(() => {
      setPhase("pricing");
    }, DEMO_TIMING.condition);

    const t3 = setTimeout(() => {
      setPhase("done");
    }, DEMO_TIMING.prices);

    const t4 = setTimeout(() => {
      onComplete(filled);
    }, DEMO_TIMING.complete);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [session, onComplete]);

  // Live appraisal pipeline — real AI call, progressive reveal, retryable.
  // Runs for live sessions AND for demo sessions without a selected demo
  // object, so no session can ever stall with no active effect.
  useEffect(() => {
    if (session.isDemo && session.demoObject) return;

    let cancelled = false;
    const timers: number[] = [];

    const run = async () => {
      setError(null);
      setPhase("identifying");

      const outcome = await appraiseItem({ image: session.image });
      if (cancelled) return;

      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }

      timers.push(
        window.setTimeout(() => setPhase("condition"), 800),
        window.setTimeout(() => setPhase("pricing"), 1700),
        window.setTimeout(() => setPhase("done"), 2500),
        window.setTimeout(() => onComplete(outcome.result), 3200),
      );
    };

    run();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [session, onComplete, attempt]);

  const handleRetry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const stepIndex = PHASE_ORDER.indexOf(phase);
  const itemName =
    session.isDemo && session.demoObject
      ? DEMO_RESULTS[session.demoObject as ExampleObject]?.itemName
      : null;

  const conditionGrade =
    session.isDemo && session.demoObject
      ? DEMO_RESULTS[session.demoObject as ExampleObject]?.conditionGrade
      : null;

  const priceLow =
    session.isDemo && session.demoObject
      ? DEMO_RESULTS[session.demoObject as ExampleObject]?.resaleRangeLow
      : null;

  const priceHigh =
    session.isDemo && session.demoObject
      ? DEMO_RESULTS[session.demoObject as ExampleObject]?.resaleRangeHigh
      : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <div className="w-full max-w-lg mx-auto space-y-6 pt-8">
        {/* Phase indicator */}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
            Analyzing your item
          </p>
          <p className="text-xs text-foreground/35 mt-1">
            {phase === "identifying" && "Identifying your item…"}
            {phase === "condition" && "Assessing condition…"}
            {phase === "pricing" && "Checking market prices…"}
            {phase === "done" && "Almost there!"}
          </p>
        </div>

        {/* Captured image */}
        <Card className="overflow-hidden shadow-card">
          <AspectRatio ratio={16 / 9}>
            <img
              src={session.image}
              alt="Your item being analyzed"
              className="w-full h-full object-cover"
            />
          </AspectRatio>
        </Card>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{
              width:
                phase === "identifying"
                  ? "30%"
                  : phase === "condition"
                    ? "55%"
                    : phase === "pricing"
                      ? "80%"
                      : "100%",
            }}
          />
        </div>

        {/* Vertical checklist */}
        <div className="space-y-3">
          <ChecklistRow
            label="Identifying your item"
            state={stepIndex >= 1 ? "done" : stepIndex === 0 ? "active" : "pending"}
          >
            {itemName && (
              <span className="font-medium text-foreground">{itemName}</span>
            )}
          </ChecklistRow>

          <ChecklistRow
            label="Assessing condition"
            state={stepIndex >= 2 ? "done" : stepIndex === 1 ? "active" : "pending"}
          >
            {conditionGrade && (
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  conditionGrade === "Mint" || conditionGrade === "Excellent"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : conditionGrade === "Good"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                }`}
              >
                {conditionGrade}
              </span>
            )}
          </ChecklistRow>

          <ChecklistRow
            label="Checking market prices"
            state={stepIndex >= 3 ? "done" : stepIndex === 2 ? "active" : "pending"}
          >
            {priceLow !== null && priceHigh !== null && (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-heading font-bold text-primary">
                  {formatINR(priceLow)}
                </span>
                <span className="text-foreground/50 text-sm font-medium">–</span>
                <span className="text-2xl font-heading font-bold text-foreground">
                  {formatINR(priceHigh)}
                </span>
              </div>
            )}
          </ChecklistRow>

          <ChecklistRow
            label="Preparing your listing"
            state={phase === "done" ? "active" : "pending"}
          />
        </div>

        {/* Error state — never a dead-end */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-800">
                  We couldn't finish the appraisal
                </p>
                <p className="text-xs text-red-700/80 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRetry}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        )}

        {/* Caption for demo mode */}
        {session.isDemo && session.demoObject && (
          <p className="text-center text-xs text-foreground/35">
            Demo mode &middot; results are pre-cached
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Checklist row that fills in with content ── */
function ChecklistRow({
  label,
  state,
  children,
}: {
  label: string;
  state: "pending" | "active" | "done";
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border transition-all duration-500 ease-out p-4 ${
        state === "pending"
          ? "border-transparent bg-transparent"
          : "border-border bg-white shadow-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 shrink-0 ${
            state === "done"
              ? "text-primary"
              : state === "active"
                ? "text-primary"
                : "text-foreground/20"
          }`}
        >
          {state === "done" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : state === "active" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              state === "pending" ? "text-foreground/30" : "text-foreground/40"
            }`}
          >
            {label}
          </p>
          {state !== "pending" && children}
        </div>
      </div>
    </div>
  );
}
