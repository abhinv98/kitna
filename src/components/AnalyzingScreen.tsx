import type { AppraisalData } from "@/App";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface AnalyzingScreenProps {
  data: AppraisalData;
  onComplete: () => void;
}

export default function AnalyzingScreen({ data, onComplete }: AnalyzingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto space-y-8 text-center">
        <p className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
          Analyzing your item
        </p>
        <Card className="overflow-hidden shadow-card">
          <AspectRatio ratio={16 / 9}>
            <img
              src={data.image}
              alt="Your item being analyzed"
              className="w-full h-full object-cover"
            />
          </AspectRatio>
        </Card>
        <p className="text-foreground/40 text-sm">
          Identifying &amp; appraising&hellip; (coming in Phase 2)
        </p>
        <button
          onClick={onComplete}
          className="text-sm text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer"
        >
          Skip to Results &rarr;
        </button>
      </div>
    </div>
  );
}