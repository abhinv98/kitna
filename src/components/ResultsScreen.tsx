import type { AppraisalData } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { RefreshCw } from "lucide-react";

interface ResultsScreenProps {
  data: AppraisalData;
  onReset: () => void;
}

export default function ResultsScreen({ data, onReset }: ResultsScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <div className="w-full max-w-lg mx-auto space-y-6 pt-8">
        <p className="text-sm font-medium text-foreground/60 uppercase tracking-wider text-center">
          Appraisal complete
        </p>

        <Card className="overflow-hidden shadow-card">
          <AspectRatio ratio={16 / 9}>
            <img
              src={data.image}
              alt="Your appraised item"
              className="w-full h-full object-cover"
            />
          </AspectRatio>
          <CardContent className="pt-6 space-y-2 text-center">
            <p className="text-foreground/40 text-sm">
              Results &amp; listing will appear here (coming in Phase 3)
            </p>
          </CardContent>
        </Card>

        <Button
          size="lg"
          onClick={onReset}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4" />
          Appraise another
        </Button>
      </div>
    </div>
  );
}