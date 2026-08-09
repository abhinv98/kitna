import { useState, useEffect, useCallback } from "react";
import type { AppraisalSession, AppraisalResult } from "@/lib/types";
import { DEMO_RESULTS, DEMO_TIMING } from "@/lib/demo-data";
import type { ExampleObject } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatINR } from "@/lib/currency";

interface AnalyzingScreenProps {
  session: AppraisalSession;
  onComplete: (result: AppraisalResult) => void;
}

type Phase = "identifying" | "condition" | "pricing" | "done";

export default function AnalyzingScreen({
  session,
  onComplete,
}: AnalyzingScreenProps) {
  const [phase, setPhase] = useState<Phase>("identifying");
  const [result, setResult] = useState<AppraisalResult | null>(null);

  // Simulate progressive analysis
  useEffect(() => {
    if (!session.isDemo || !session.demoObject) return;

    const demoObj = session.demoObject as ExampleObject;
    const baseResult = DEMO_RESULTS[demoObj];
    if (!baseResult) return;

    const filled: AppraisalResult = {
      ...baseResult,
      image: session.image,
    };

    // Progressive reveal timeline
    const t1 = setTimeout(() => {
      setPhase("condition");
    }, DEMO_TIMING.itemName);

    const t2 = setTimeout(() => {
      setPhase("pricing");
    }, DEMO_TIMING.condition);

    const t3 = setTimeout(() => {
      setPhase("done");
      setResult(filled);
    }, DEMO_TIMING.pricing);

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
            {phase === "pricing" && "Checking prices…"}
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

        {/* Progressive result cards */}
        <div className="space-y-3">
          {/* Item identification */}
          <SkeletonCard
            label="Item"
            visible={phase !== "identifying" || !!itemName}
          >
            {itemName && (
              <span className="font-medium text-foreground">{itemName}</span>
            )}
          </SkeletonCard>

          {/* Condition assessment */}
          <SkeletonCard
            label="Condition"
            visible={phase === "condition" || phase === "pricing" || phase === "done"}
          >
            {conditionGrade && (
              <span className="inline-flex items-center gap-2">
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
              </span>
            )}
          </SkeletonCard>

          {/* Price estimate */}
          <SkeletonCard
            label="Estimated resale value"
            visible={phase === "pricing" || phase === "done"}
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
          </SkeletonCard>
        </div>

        {/* Caption for demo mode */}
        {session.isDemo && (
          <p className="text-center text-xs text-foreground/35">
            Demo mode &middot; results are pre-cached
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton card that fills in with content ── */
function SkeletonCard({
  label,
  visible,
  children,
}: {
  label: string;
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border transition-all duration-500 ease-out ${
        visible
          ? "border-border bg-white shadow-card opacity-100"
          : "border-transparent bg-transparent opacity-0"
      } ${visible ? "p-4" : "p-4"}`}
    >
      {visible && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
            {label}
          </p>
          {children}
        </div>
      )}
    </div>
  );
}