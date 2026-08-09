import { useState, useRef, useCallback } from "react";
import { useWebcam, type CameraState } from "@/hooks/useWebcam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Camera,
  Upload,
  X,
  ImageIcon,
  Monitor,
  Check,
} from "lucide-react";
import type { AppraisalSession } from "@/lib/types";
import { EXAMPLE_OBJECTS as SHARED_EXAMPLE_OBJECTS } from "@/lib/types";

interface CaptureScreenProps {
  onCapture: (data: AppraisalSession) => void;
}

export default function CaptureScreen({ onCapture }: CaptureScreenProps) {
  const { videoRef, cameraState, error, captureFrame } = useWebcam();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedDemoObject, setSelectedDemoObject] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = uploadedImage !== null;
  const showWebcam = !hasImage && cameraState === "active";

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setSelectedDemoObject(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleAppraise = useCallback(() => {
    const image = hasImage
      ? uploadedImage
      : captureFrame();

    if (!image) return;

    onCapture({
      image,
      isDemo: isDemoMode,
      demoObject: isDemoMode ? (selectedDemoObject ?? undefined) : undefined,
    });
  }, [hasImage, uploadedImage, captureFrame, isDemoMode, selectedDemoObject, onCapture]);

  const handleBadgeClick = useCallback(
    (obj: string) => {
      if (isDemoMode) {
        setSelectedDemoObject((prev) => (prev === obj ? null : obj));
      }
    },
    [isDemoMode],
  );

  const clearUploadedImage = useCallback(() => {
    setUploadedImage(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-heading font-semibold text-foreground tracking-tight">
            Kitna?
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            Find out what your stuff is worth
          </p>
        </header>

        {/* Viewfinder or Uploaded Preview */}
        <Card className="overflow-hidden shadow-card">
          <AspectRatio ratio={16 / 9}>
            {showWebcam && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover bg-black"
              />
            )}

            {hasImage && (
              <div className="relative w-full h-full">
                <img
                  src={uploadedImage!}
                  alt="Uploaded item for appraisal"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={clearUploadedImage}
                  aria-label="Remove uploaded image"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!showWebcam && !hasImage && (
              <CameraPlaceholder
                cameraState={cameraState}
                error={error}
              />
            )}
          </AspectRatio>
        </Card>

        {/* Appraise button — visible when webcam is active */}
        {showWebcam && (
          <Button
            size="xl"
            onClick={handleAppraise}
            className="w-full"
          >
            <Camera className="w-5 h-5" />
            Appraise this
          </Button>
        )}

        {/* OR divider */}
        {!hasImage && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Upload zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a photo of your item"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`
            relative rounded-xl border-2 border-dashed p-8 text-center
            transition-all duration-200 ease-out cursor-pointer
            ${isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
            }
            ${hasImage ? "border-primary/30 bg-primary/[0.03]" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          {hasImage ? (
            <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
              <ImageIcon className="w-4 h-4" />
              Photo uploaded &mdash; click to change
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground/60">
                Drop a photo here or{" "}
                <span className="text-primary underline underline-offset-2">click to browse</span>
              </p>
              <p className="text-xs text-foreground/35">
                JPEG, PNG, or WebP
              </p>
            </div>
          )}
        </div>

        {/* Appraise button for uploaded image */}
        {hasImage && (
          <Button
            size="xl"
            onClick={handleAppraise}
            className="w-full"
          >
            <Camera className="w-5 h-5" />
            Appraise this
          </Button>
        )}

        {/* Example badges */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
            Try it with
          </p>
          <div className="flex flex-wrap gap-2">
            {SHARED_EXAMPLE_OBJECTS.map((obj) => {
              const isSelected = isDemoMode && selectedDemoObject === obj;
              return (
                <Badge
                  key={obj}
                  variant={isSelected ? "primary" : "default"}
                  onClick={() => handleBadgeClick(obj)}
                  className={`
                    transition-all duration-200
                    ${isDemoMode ? "hover:scale-105" : ""}
                  `}
                >
                  {isSelected && (
                    <Check className="w-3 h-3 mr-0.5 text-primary" />
                  )}
                  {obj}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Helper text */}
        <p className="text-xs text-center text-foreground/35">
          Works best with the item filling the frame.
        </p>

        {/* Demo mode toggle */}
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          <div className="space-y-0.5">
            <label
              htmlFor="demo-mode"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Demo mode
            </label>
            <p className="text-xs text-foreground/40">
              Try it with pre-cached results, no camera needed
            </p>
          </div>
          <Switch
            id="demo-mode"
            checked={isDemoMode}
            onCheckedChange={(checked) => {
              setIsDemoMode(checked);
              if (!checked) setSelectedDemoObject(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Camera placeholder when webcam is unavailable ── */
function CameraPlaceholder({
  cameraState,
  error,
}: {
  cameraState: CameraState;
  error: string | null;
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-muted/30 p-6">
      {cameraState === "loading" ? (
        <>
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-foreground/50">Starting camera&hellip;</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            {cameraState === "blocked" ? (
              <Monitor className="w-6 h-6 text-amber-500" />
            ) : (
              <Camera className="w-6 h-6 text-foreground/30" />
            )}
          </div>
          <p className="text-sm text-foreground/60 text-center max-w-xs">
            {error ?? "Camera unavailable."}
          </p>
        </>
      )}
    </div>
  );
}