import { useState } from "react";
import { Toaster } from "sonner";
import CaptureScreen from "@/components/CaptureScreen";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import ResultsScreen from "@/components/ResultsScreen";
import type { AppScreen, AppraisalSession, AppraisalResult } from "@/lib/types";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("capture");
  const [session, setSession] = useState<AppraisalSession | null>(null);
  const [result, setResult] = useState<AppraisalResult | null>(null);

  const handleCapture = (data: AppraisalSession) => {
    setSession(data);
    setResult(null);
    setScreen("analyzing");
  };

  const handleAnalysisComplete = (appraisal: AppraisalResult) => {
    setResult(appraisal);
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
        {screen === "analyzing" && session && (
          <AnalyzingScreen
            session={session}
            onComplete={handleAnalysisComplete}
          />
        )}
        {screen === "results" && result && (
          <ResultsScreen result={result} onReset={handleReset} />
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