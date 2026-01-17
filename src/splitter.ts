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

export { countGraphemes };
