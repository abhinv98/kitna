import { useState, useRef, useCallback, useEffect } from "react";

export type CameraState = "loading" | "active" | "blocked" | "unavailable";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("loading");
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraState("loading");
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("unavailable");
      setError("Your browser doesn't support camera access. Try uploading a photo instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("active");
    } catch (err: unknown) {
      streamRef.current = null;
      const name = (err as DOMException).name;

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraState("blocked");
        setError("Camera access was denied. You can upload a photo instead.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraState("unavailable");
        setError("No camera found on this device. You can upload a photo instead.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setCameraState("unavailable");
        setError("Your camera is already in use by another app. You can upload a photo instead.");
      } else {
        setCameraState("unavailable");
        setError("Couldn't access the camera. You can upload a photo instead.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // The <video> element only mounts once cameraState becomes "active", which
  // happens after getUserMedia resolves. By then the in-function attachment
  // in startCamera was a no-op (videoRef.current was null), so attach the
  // already-acquired stream here once the element exists.
  useEffect(() => {
    if (cameraState !== "active") return;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      // Element is muted + playsInline, so this should not reject in
      // practice; swallow autoplay errors instead of surfacing them.
    });
  }, [cameraState]);

  return { videoRef, cameraState, error, captureFrame, startCamera };
}