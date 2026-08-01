import { useState } from "react";
import CaptureScreen from "@/components/CaptureScreen";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import ResultsScreen from "@/components/ResultsScreen";

export type AppScreen = "capture" | "analyzing" | "results";

export interface AppraisalData {
  image: string;
  isDemo: boolean;
  demoObject?: string;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("capture");
  const [appraisalData, setAppraisalData] = useState<AppraisalData | null>(null);

  const handleCapture = (data: AppraisalData) => {
    setAppraisalData(data);
    setScreen("analyzing");
  };

  const handleAnalysisComplete = () => {
    setScreen("results");
  };

  const handleReset = () => {
    setAppraisalData(null);
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
        {screen === "analyzing" && (
          <AnalyzingScreen data={appraisalData!} onComplete={handleAnalysisComplete} />
        )}
        {screen === "results" && (
          <ResultsScreen data={appraisalData!} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}