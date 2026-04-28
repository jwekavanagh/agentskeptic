import { appendFileSync } from "node:fs";
import type { RunEvent } from "../../types.js";
import type { EventSink } from "./types.js";

export class BufferSink implements EventSink {
  private readonly events: RunEvent[] = [];

  write(event: RunEvent): void {
    this.events.push(event);
  }

  snapshot(): RunEvent[] {
    return this.events.slice();
  }
}

export class NdjsonFileSink implements EventSink {
  constructor(private readonly filePath: string) {}

  write(event: RunEvent): void {
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }
}
