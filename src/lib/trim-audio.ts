// The voice clone provider rejects samples longer than ~25 seconds.
// Trim long uploads in the browser to the first MAX_SECONDS and re-encode as mono WAV.
export const CLONE_MAX_SECONDS = 24;

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Returns the original file if short enough, otherwise a trimmed WAV file. */
export async function trimAudioForClone(file: File): Promise<{ file: File; trimmed: boolean; duration: number }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const duration = decoded.duration;
    if (duration <= CLONE_MAX_SECONDS) return { file, trimmed: false, duration };

    const targetRate = 22050;
    const length = Math.floor(CLONE_MAX_SECONDS * targetRate);
    const offline = new OfflineAudioContext(1, length, targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    const blob = encodeWav(rendered.getChannelData(0), targetRate);
    const name = file.name.replace(/\.[^.]+$/, "") + ".wav";
    return { file: new File([blob], name, { type: "audio/wav" }), trimmed: true, duration };
  } finally {
    ctx.close().catch(() => {});
  }
}
