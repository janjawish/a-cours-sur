import { useCallback, useEffect, useRef, useState } from "react";
import { appendAudio, startRecording, stopRecording } from "../lib/api";

const TARGET_RATE = 16_000;

function downsample(input: Float32Array, sourceRate: number): number[] {
  if (sourceRate === TARGET_RATE) {
    return Array.from(input, (value) => Math.max(-32768, Math.min(32767, Math.round(value * 32767))));
  }
  const ratio = sourceRate / TARGET_RATE;
  const result = new Array<number>(Math.floor(input.length / ratio));
  for (let i = 0; i < result.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end && j < input.length; j += 1) sum += input[j];
    const value = sum / (end - start);
    result[i] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
  }
  return result;
}

export function useRecorder(courseId?: number) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string>();
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const processor = useRef<ScriptProcessorNode | undefined>(undefined);
  const startedAt = useRef(0);
  const pending = useRef<number[]>([]);
  const writeChain = useRef(Promise.resolve());

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  const flush = useCallback(() => {
    if (pending.current.length === 0) return;
    const chunk = pending.current;
    pending.current = [];
    writeChain.current = writeChain.current.then(() => appendAudio(chunk)).catch((reason) => {
      setError(`Écriture audio interrompue : ${String(reason)}`);
    });
  }, []);

  const start = useCallback(async () => {
    if (!courseId || recording) return;
    setError(undefined);
    await startRecording(courseId);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream.current);
      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);
      processor.current.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let i = 0; i < input.length; i += 1) energy += input[i] * input[i];
        setLevel(Math.min(1, Math.sqrt(energy / input.length) * 7));
        pending.current.push(...downsample(input, audioContext.current?.sampleRate ?? 48_000));
        if (pending.current.length >= TARGET_RATE) flush();
      };
      source.connect(processor.current);
      processor.current.connect(audioContext.current.destination);
      startedAt.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
    } catch (reason) {
      await stopRecording(courseId, 0).catch(() => undefined);
      setError(reason instanceof Error ? reason.message : "Microphone inaccessible");
    }
  }, [courseId, flush, recording]);

  const stop = useCallback(async () => {
    if (!courseId || !recording) return;
    processor.current?.disconnect();
    stream.current?.getTracks().forEach((track) => track.stop());
    await audioContext.current?.close();
    flush();
    await writeChain.current;
    const finalDuration = Date.now() - startedAt.current;
    await stopRecording(courseId, finalDuration);
    setElapsedMs(finalDuration);
    setLevel(0);
    setRecording(false);
  }, [courseId, flush, recording]);

  useEffect(() => () => {
    processor.current?.disconnect();
    stream.current?.getTracks().forEach((track) => track.stop());
    void audioContext.current?.close();
  }, []);

  return { recording, elapsedMs, level, error, start, stop };
}
