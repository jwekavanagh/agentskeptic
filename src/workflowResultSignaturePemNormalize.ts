/** LF endings; trim outer whitespace; ensure trailing newline after PEM block. */
export function normalizeSpkiPemForSidecar(pemUtf8: string): string {
  let s = pemUtf8.replace(/\r\n/g, "\n").trim();
  if (!s.endsWith("\n")) s += "\n";
  return s;
}
