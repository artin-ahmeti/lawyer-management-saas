'use client';

import { useEffect, useRef, useState } from 'react';

/** Local recording only. The saved URL lives for this in-memory preview session. */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const url = useRef('');
  const retained = useRef(false);
  const disposed = useRef(false);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (url.current && !retained.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is unavailable in this browser. You can type a transcript below.');
      return;
    }
    setPending(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const current = new MediaRecorder(media);
      const chunks: BlobPart[] = [];
      current.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      current.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (disposed.current) return;
        setRecording(false);
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(
          new Blob(chunks, { type: current.mimeType || 'audio/webm' }),
        );
        setAudioUrl(url.current);
      };
      current.onerror = () => {
        media.getTracks().forEach((track) => track.stop());
        if (!disposed.current) {
          setRecording(false);
          setError('Recording failed. Please try again.');
        }
      };
      recorder.current = current;
      current.start();
      setRecording(true);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (!disposed.current)
        setError(
          'Microphone access was unavailable. Allow access to record, or type a transcript.',
        );
    } finally {
      if (!disposed.current) setPending(false);
    }
  };
  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };
  const retain = () => {
    retained.current = true;
  };
  return { recording, pending, audioUrl, error, start, stop, retain };
}
