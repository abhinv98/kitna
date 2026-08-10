import { lazy, Suspense, useState } from "react";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import CaptureScreen from "@/components/CaptureScreen";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import ResultsScreen from "@/components/ResultsScreen";
import ListingScreen from "@/components/ListingScreen";
import type { AppScreen, AppraisalSession, AppraisalResult } from "@/lib/types";

// Lazy — the scan screen pulls in TensorFlow.js + COCO-SSD, which should
// only load when the user actually reaches the scan step.
const ScanScreen = lazy(() => import("@/components/ScanScreen"));

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("capture");
  const [session, setSession] = useState<AppraisalSession | null>(null);
  const [result, setResult] = useState<AppraisalResult | null>(null);

  const handleCapture = (data: AppraisalSession) => {
    setSession(data);
    setResult(null);
    // Demo mode uses pre-cached results — skip the on-device scan.
    setScreen(data.isDemo ? "analyzing" : "scan");
  };

  const handleScanComplete = (detectedObject: string | null) => {
    setSession((prev) =>
      prev ? { ...prev, detectedObject: detectedObject ?? undefined } : prev,
    );
    setScreen("analyzing");
  };

  const handleScanBack = () => {
    setSession(null);
    setResult(null);
    setScreen("capture");
  };

  const handleAnalysisComplete = (appraisal: AppraisalResult) => {
    setResult(appraisal);
    setScreen("results");
  };

  const handleCreateListing = () => {
    setScreen("listing");
  };

  const handleBackToResults = () => {
    setScreen("results");
  };

  const handleReset = () => {
    setSession(null);
    setResult(null);
    setScreen("capture");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded focus:shadow-card"
      >
        Skip to main content
      </a>

      <main id="main-content">
        {screen === "capture" && <CaptureScreen onCapture={handleCapture} />}
        {screen === "scan" && session && (
          <Suspense
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  <p className="text-sm text-foreground/50">Starting scanner&hellip;</p>
                </div>
              </div>
            }
          >
            <ScanScreen
              session={session}
              onComplete={handleScanComplete}
              onBack={handleScanBack}
            />
          </Suspense>
        )}
        {screen === "analyzing" && session && (
          <AnalyzingScreen
            session={session}
            onComplete={handleAnalysisComplete}
          />
        )}
        {screen === "results" && result && (
          <ResultsScreen
            result={result}
            onReset={handleReset}
            onCreateListing={handleCreateListing}
          />
        )}
        {screen === "listing" && result && (
          <ListingScreen
            result={result}
            onBack={handleBackToResults}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Sonner toast */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "oklch(0.25 0.02 260)",
            color: "white",
            borderRadius: "0.75rem",
            border: "none",
          },
        }}
      />
    </div>
  );
}
