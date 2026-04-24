export type DebugConsoleUrlState = {
  tab: string;
  run: string | null;
  filters: Record<string, string>;
};

export const DEBUG_CONSOLE_DEFAULT_TAB: string;

export function parseDebugConsoleUrl(searchParams: URLSearchParams): DebugConsoleUrlState;

export function defaultFilterRecord(): Record<string, string>;

export function resolvedFilters(filters: Record<string, string>): Record<string, string>;

export function serializeDebugConsoleUrl(state: DebugConsoleUrlState): string;
