import { useEffect, useMemo, useRef, useState } from "react";
import type { ScanDetection } from "@/lib/scan";

interface CameraOverlayProps {
  imageSrc: string;
  detections: ScanDetection[];
  /** Index of the detection to emphasize (the top pick), else -1. */
  highlightIndex?: number;
  /** When true, shows the sweeping scan line animation. */
  scanning?: boolean;
}

/**
 * Renders the captured image with COCO-SSD bounding boxes mapped from
 * natural image pixels onto the displayed (object-contain) image rect.
 * Boxes are purely decorative — real information is announced via
 * aria-live in ScanScreen, so they are hidden from assistive tech.
 */
export default function CameraOverlay({
  imageSrc,
  detections,
  highlightIndex = -1,
  scanning = false,
}: CameraOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Track the container size so boxes stay aligned on resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Map natural image pixels → displayed rect under object-contain.
  const mapping = useMemo(() => {
    if (!box || !natural) return null;
    const scale = Math.min(box.w / natural.w, box.h / natural.h);
    return {
      scale,
      offsetX: (box.w - natural.w * scale) / 2,
      offsetY: (box.h - natural.h * scale) / 2,
    };
  }, [box, natural]);

  const topLabel = detections[highlightIndex]?.label ?? detections[0]?.label;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      <img
        src={imageSrc}
        alt={topLabel ? `Your item, detected as ${topLabel}` : "Your item being scanned"}
        className="w-full h-full object-contain"
        onLoad={(e) => {
          const el = e.currentTarget;
          setNatural({ w: el.naturalWidth, h: el.naturalHeight });
        }}
      />

      {/* Sweeping scan line */}
      {scanning && (
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-primary/40 to-transparent animate-scan motion-reduce:animate-none"
        />
      )}

      {/* Bounding boxes */}
      {mapping &&
        detections.map((d, i) => {
          const isHighlight = i === highlightIndex;
          const left = mapping.offsetX + d.bbox[0] * mapping.scale;
          const top = mapping.offsetY + d.bbox[1] * mapping.scale;
          const width = d.bbox[2] * mapping.scale;
          const height = d.bbox[3] * mapping.scale;

          return (
            <div
              key={`${d.className}-${i}`}
              aria-hidden="true"
              className={`absolute rounded-lg border-2 transition-all duration-300 ${
                isHighlight ? "border-primary" : "border-white/70"
              }`}
              style={{ left, top, width, height }}
            >
              <span
                className={`absolute -top-6 left-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                  isHighlight ? "bg-primary text-on-primary" : "bg-black/70 text-white"
                }`}
              >
                {d.label} &middot; {Math.round(d.score * 100)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
