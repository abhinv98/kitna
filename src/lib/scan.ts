/* ── On-device object detection for the "scan" step ────────────────────────
 *
 * Wraps COCO-SSD (TensorFlow.js) running fully in the browser — the photo
 * never leaves the device. The model + weights are lazy-loaded on first use
 * and cached for the session, so re-entering the scan step is instant.
 * Everything here is dynamic-imported so tfjs stays out of the main bundle.
 */

export interface ScanDetection {
  /** [x, y, width, height] in natural image pixels */
  bbox: [number, number, number, number];
  /** Raw COCO class, e.g. "cell phone" */
  className: string;
  /** Friendly label, e.g. "Phone" */
  label: string;
  /** Confidence 0–1 */
  score: number;
}

interface CocoPrediction {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

/** Minimal structural type — avoids pulling tfjs types into the main bundle. */
export interface Detector {
  detect(
    img: HTMLImageElement,
    maxNumBoxes?: number,
    minScore?: number,
  ): Promise<CocoPrediction[]>;
}

/* COCO classes → friendly, resale-appropriate labels. */
const FRIENDLY_LABELS: Record<string, string> = {
  "cell phone": "Phone",
  laptop: "Laptop",
  book: "Book",
  cup: "Mug or Cup",
  bottle: "Bottle",
  tv: "TV",
  keyboard: "Keyboard",
  mouse: "Computer Mouse",
  remote: "Remote",
  chair: "Chair",
  couch: "Sofa",
  "dining table": "Table",
  "potted plant": "Plant",
  bed: "Bed",
  microwave: "Microwave",
  oven: "Oven",
  toaster: "Toaster",
  refrigerator: "Fridge",
  sink: "Sink",
  clock: "Clock",
  vase: "Vase",
  bowl: "Bowl",
  "wine glass": "Glass",
  backpack: "Backpack",
  handbag: "Handbag",
  suitcase: "Suitcase",
  umbrella: "Umbrella",
  "sports ball": "Ball",
  frisbee: "Frisbee",
  skateboard: "Skateboard",
  surfboard: "Surfboard",
  "tennis racket": "Tennis Racket",
  "baseball glove": "Baseball Glove",
  "baseball bat": "Baseball Bat",
  skis: "Skis",
  snowboard: "Snowboard",
  "teddy bear": "Teddy Bear",
  "hair drier": "Hair Dryer",
  scissors: "Scissors",
  toothbrush: "Toothbrush",
};

function friendlyLabel(className: string): string {
  return (
    FRIENDLY_LABELS[className] ??
    className
      .split(/[\s_]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

let detectorPromise: Promise<Detector> | null = null;

/** Load (and cache) the COCO-SSD detector. lite_mobilenet_v2 = fastest. */
export function getDetector(): Promise<Detector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      // Register the WebGL/CPU backends, then load the model.
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      return model as Detector;
    })();
  }
  return detectorPromise;
}

/**
 * Detect objects in an image (data URL). People are excluded — the user
 * holding the item is almost never the item itself. Results are sorted by
 * confidence, highest first.
 */
export async function detectObjects(
  detector: Detector,
  imageSrc: string,
): Promise<ScanDetection[]> {
  const img = await loadImage(imageSrc);
  const raw = await detector.detect(img, 8, 0.3);

  return raw
    .filter((p) => p.class !== "person" && p.score >= 0.3)
    .map((p) => ({
      bbox: p.bbox,
      className: p.class,
      label: friendlyLabel(p.class),
      score: p.score,
    }))
    .sort((a, b) => b.score - a.score);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the photo for scanning"));
    img.src = src;
  });
}
