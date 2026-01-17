import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, "..", "data", "book.txt");
const DEFAULT_URL = "https://www.gutenberg.org/cache/epub/1564/pg1564.txt";

function getSourceUrl(): string {
  return process.env.GUTENBERG_URL || DEFAULT_URL;
}

async function fetchFromGutenberg(): Promise<string> {
  const url = getSourceUrl();
  console.log(`Fetching from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();

  // Cache locally
  await writeFile(CACHE_PATH, text, "utf-8");
  console.log("Cached book text locally");

  return text;
}

async function getRawText(): Promise<string> {
  // Use cached version if available
  if (existsSync(CACHE_PATH)) {
    console.log("Using cached book text");
    return readFile(CACHE_PATH, "utf-8");
  }
  return fetchFromGutenberg();
}

function stripGutenbergWrapper(text: string): string {
  // Find start marker
  const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK";
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error("Could not find Gutenberg start marker");
  }
  // Skip past the marker line
  const afterStart = text.indexOf("\n", startIndex);
  if (afterStart === -1) {
    throw new Error("Malformed Gutenberg text");
  }

  // Find end marker
  const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK";
  const endIndex = text.indexOf(endMarker);
  if (endIndex === -1) {
    throw new Error("Could not find Gutenberg end marker");
  }

  return text.slice(afterStart + 1, endIndex);
}

function extractParagraphs(text: string): string[] {
  // Split on double newlines (paragraph breaks)
  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs
    .map((p) => p.trim().replace(/\s+/g, " ")) // Normalize whitespace
    .filter((p) => p.length > 0); // Remove empty
}

export async function getParagraphs(): Promise<string[]> {
  const rawText = await getRawText();
  const bookText = stripGutenbergWrapper(rawText);
  return extractParagraphs(bookText);
}

export async function getParagraph(index: number): Promise<string | null> {
  const paragraphs = await getParagraphs();
  if (index < 0 || index >= paragraphs.length) {
    return null;
  }
  return paragraphs[index];
}

export async function getTotalParagraphs(): Promise<number> {
  const paragraphs = await getParagraphs();
  return paragraphs.length;
}
