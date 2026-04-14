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
