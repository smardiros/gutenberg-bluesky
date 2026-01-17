import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, "..", "data", "state.json");

export interface State {
  currentParagraph: number;
  lastPostUri?: string;
  lastPostAt?: string;
}

const DEFAULT_STATE: State = {
  currentParagraph: 0,
};

export async function loadState(): Promise<State> {
  if (!existsSync(STATE_PATH)) {
    return { ...DEFAULT_STATE };
  }

  try {
    const content = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(content) as State;
  } catch {
    console.warn("Failed to parse state file, using defaults");
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state: State): Promise<void> {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

export async function advanceState(uri: string): Promise<State> {
  const state = await loadState();
  state.currentParagraph++;
  state.lastPostUri = uri;
  state.lastPostAt = new Date().toISOString();
  await saveState(state);
  return state;
}
