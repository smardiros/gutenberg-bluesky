const MAX_GRAPHEMES = 300;

function countGraphemes(text: string): number {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(text)].length;
}

// Common abbreviations that shouldn't end sentences
const ABBREVIATIONS = new Set([
  "Mr", "Mrs", "Ms", "Dr", "Prof", "Rev", "Hon", "Sr", "Jr",
  "St", "Mt", "Ft", "Lt", "Gen", "Col", "Capt", "Sgt",
  "vs", "etc", "al", "eg", "ie", "viz", "cf",
  "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Sept", "Oct", "Nov", "Dec",
  "vol", "Vol", "no", "No", "pp", "ed", "Ed"
]);

function isAbbreviation(text: string): boolean {
  // Get the last word before the period
  const match = text.match(/(\w+)\.$/);
  if (!match) return false;
  return ABBREVIATIONS.has(match[1]);
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space
  // Keep the punctuation with the sentence
  const sentences: string[] = [];
  let current = "";

  for (let i = 0; i < text.length; i++) {
    current += text[i];

    // Check if this is end of sentence
    if (/[.!?]/.test(text[i])) {
      // Look ahead - if next char is space or end, this is a sentence boundary
      const next = text[i + 1];
      if (next === undefined || next === " ") {
        // Don't split on abbreviations (Mr., Dr., etc.)
        if (text[i] === "." && isAbbreviation(current)) {
          continue;
        }
        // Don't split if next word starts with lowercase (likely abbreviation or continuation)
        if (next === " " && text[i] === ".") {
          const afterSpace = text[i + 2];
          if (afterSpace && /[a-z]/.test(afterSpace)) {
            continue;
          }
        }
        sentences.push(current.trim());
        current = "";
        // Skip the space after punctuation
        if (next === " ") {
          i++;
        }
      }
    }
  }

  // Don't forget any remaining text
  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

function splitOnWords(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (countGraphemes(test) <= MAX_GRAPHEMES) {
      current = test;
    } else {
      if (current) {
        chunks.push(current);
      }
      // If single word exceeds limit, we have to include it anyway
      current = word;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function splitIntoPostChunks(paragraph: string): string[] {
  // If it fits in one post, return as-is
  if (countGraphemes(paragraph) <= MAX_GRAPHEMES) {
    return [paragraph];
  }

  // Split into sentences first
  const sentences = splitIntoSentences(paragraph);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    // If this single sentence is too long, split on words
    if (countGraphemes(sentence) > MAX_GRAPHEMES) {
      // First, push current chunk if any
      if (current) {
        chunks.push(current);
        current = "";
      }
      // Then split the long sentence
      const wordChunks = splitOnWords(sentence);
      chunks.push(...wordChunks);
      continue;
    }

    // Try to add sentence to current chunk
    const test = current ? `${current} ${sentence}` : sentence;

    if (countGraphemes(test) <= MAX_GRAPHEMES) {
      current = test;
    } else {
      // Current chunk is full, start new one
      if (current) {
        chunks.push(current);
      }
      current = sentence;
    }
  }

  // Don't forget the last chunk
  if (current) {
    chunks.push(current);
  }

  return chunks;
}

const MAX_THREAD_LENGTH = 3;

function hasUnclosedQuote(text: string): boolean {
  // Track quote state more carefully to avoid false positives from apostrophes
  // Opening single quote: after whitespace/start, before letter
  // Closing single quote: after letter, before whitespace/punctuation/end
  // Possessive/contraction: letter + ' + letter (e.g., "don't", "Johnson's")

  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = text[i - 1];
    const next = text[i + 1];

    if (char === '"') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'") {
      // Skip if it looks like a contraction or possessive
      // (letter before and letter after, or letter before and 's' after)
      const letterBefore = prev && /[a-zA-Z]/.test(prev);
      const letterAfter = next && /[a-zA-Z]/.test(next);

      if (letterBefore && letterAfter) {
        // Contraction like "don't" - skip
        continue;
      }
      if (letterBefore && (!next || /[\s.,;:!?]/.test(next))) {
        // Possessive like "Johnson's" at end or before punctuation - skip
        continue;
      }

      // Otherwise treat as quote
      inSingleQuote = !inSingleQuote;
    }
  }

  return inDoubleQuote || inSingleQuote;
}

function isInsideQuote(chunks: string[], endIndex: number): boolean {
  // Check if we're inside a quote by looking at all text up to endIndex
  const textSoFar = chunks.slice(0, endIndex + 1).join(" ");
  return hasUnclosedQuote(textSoFar);
}

export function groupChunksIntoThreads(chunks: string[]): string[][] {
  if (chunks.length <= MAX_THREAD_LENGTH) {
    return [chunks];
  }

  const threads: string[][] = [];
  let currentThread: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    currentThread.push(chunks[i]);

    // Check if we should break here
    if (currentThread.length >= MAX_THREAD_LENGTH) {
      // Don't break if we're inside a quote
      if (!isInsideQuote(chunks, i) || i === chunks.length - 1) {
        threads.push(currentThread);
        currentThread = [];
      }
      // If inside quote and thread is getting too long (>6), force break anyway
      else if (currentThread.length > MAX_THREAD_LENGTH + 2) {
        threads.push(currentThread);
        currentThread = [];
      }
    }
  }

  // Don't forget remaining chunks
  if (currentThread.length > 0) {
    threads.push(currentThread);
  }

  return threads;
}

export { countGraphemes };
