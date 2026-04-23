const FAILURE_HEADING = "### Failure (`wf_missing`)";

/**
 * Returns the bundled-demo failure block from the discovery SSOT transcript
 * (same bytes as the acquisition page), for homepage hero visual proof.
 */
export function shareableTerminalFailureExcerpt(transcript: string): string {
  const i = transcript.indexOf(FAILURE_HEADING);
  if (i === -1) return transcript.trim();
  return transcript.slice(i).trim();
}

/**
 * The JSON object in the `wf_missing` failure block, for a compact "raw output" readout.
 */
export function shareableTerminalFailureJsonOnly(transcript: string): string {
  const full = shareableTerminalFailureExcerpt(transcript);
  const start = full.indexOf("{");
  const end = full.lastIndexOf("}");
  if (start < 0 || end < start) return full;
  return full.slice(start, end + 1).trim();
}
