import { getSupabase } from "@/lib/supabase";

export interface TranscriptionResult {
  transcript: string;
}

const WS_URL = "wss://eu.rt.speechmatics.com/v2";
const TARGET_SAMPLE_RATE = 16000;
const MAX_SECONDS = 10;

type AudioContextConstructor = typeof AudioContext;

function getAudioContext(): AudioContext {
  const Ctor: AudioContextConstructor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  if (!Ctor) throw new Error("Audio recording isn't supported in this browser");

  // Ask the context to resample the mic to 16 kHz mono; fall back to the
  // browser's native rate if the option is unsupported (raw PCM at the
  // context's actual sample rate is still valid for Speechmatics).
  try {
    return new Ctor({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    return new Ctor();
  }
}

/**
 * Record one short mic utterance and transcribe it with Speechmatics.
 *
 * Flow: fetch a short-lived JWT from the `speechmatics-token` Edge Function
 * (the raw API key never leaves the server), open the realtime WebSocket with
 * that JWT, stream raw PCM_S16LE audio, and resolve with the final transcript.
 *
 * Throws with a human-readable message when voice practice isn't configured
 * or the mic/connection fails.
 */
export async function transcribeOnce(maxSeconds = MAX_SECONDS): Promise<TranscriptionResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("speechmatics-token", {});

  if (error || !data?.token || typeof data.token !== "string") {
    throw new Error(
      error?.message ?? "Voice practice isn't configured yet — the Speechmatics key is missing.",
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  const ctx = getAudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  // Keep the audio graph alive without routing the mic to the speakers.
  const silent = ctx.createGain();
  silent.gain.value = 0;

  return new Promise<TranscriptionResult>((resolve, reject) => {
    let socket: WebSocket | null = null;
    let audioMessagesSent = 0;
    let settled = false;
    let finalText = "";
    let stopTimer: number | undefined;

    const cleanup = () => {
      if (stopTimer) window.clearTimeout(stopTimer);
      try {
        source.disconnect();
        processor.disconnect();
        silent.disconnect();
      } catch {
        // already disconnected
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => {});
      if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
    };

    const finish = (ok: boolean, text?: string, errMsg?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      const transcript = (text ?? "").trim();
      if (ok && transcript) {
        resolve({ transcript });
      } else {
        reject(
          new Error(
            errMsg ?? (transcript ? "" : "Couldn't hear anything — try again and speak up."),
          ),
        );
      }
    };

    processor.onaudioprocess = (e) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      socket.send(pcm.buffer);
      audioMessagesSent += 1;
    };

    socket = new WebSocket(`${WS_URL}?jwt=${encodeURIComponent(data.token)}`);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      socket?.send(
        JSON.stringify({
          type: "session",
          message: "StartRecognition",
          audio_format: {
            type: "raw",
            encoding: "pcm_s16le",
            sample_rate: ctx.sampleRate,
          },
          transcription_config: {
            language: "en",
            enable_partials: false,
            max_delay: 1.5,
          },
        }),
      );
      // Hard stop: tell Speechmatics the stream is over after maxSeconds.
      stopTimer = window.setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "end_of_stream",
              last_seq_no: audioMessagesSent,
            }),
          );
        }
      }, maxSeconds * 1000);
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        if (msg.message === "AddTranscript") {
          const meta = msg.metadata as { transcript?: string } | undefined;
          const chunk = (meta?.transcript ?? "").trim();
          if (chunk) finalText = finalText ? `${finalText} ${chunk}` : chunk;
        } else if (msg.message === "EndOfTranscript") {
          finish(true, finalText);
        } else if (msg.message === "Error" || msg.type === "error") {
          const detail =
            (msg as { error?: string }).error ?? "Speechmatics returned an error";
          finish(false, undefined, detail);
        }
      } catch {
        // ignore non-JSON frames
      }
    };

    socket.onerror = () => finish(false, undefined, "Voice connection failed — try again.");
    socket.onclose = () => {
      if (!settled) finish(finalText.length > 0, finalText);
    };
  }).finally(() => {
    // Belt-and-braces cleanup if the promise settled via throw before cleanup ran.
    stream.getTracks().forEach((t) => t.stop());
  });
}
