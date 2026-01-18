import "dotenv/config";
import { getParagraph, getTotalParagraphs } from "./text-parser.js";
import { splitIntoPostChunks, countGraphemes, groupChunksIntoThreads } from "./splitter.js";
import { post } from "./bluesky.js";
import { loadState, saveState } from "./state.js";

interface Options {
  dryRun: boolean;
  paragraph?: number;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      options.dryRun = true;
    } else if (args[i] === "--paragraph" && args[i + 1]) {
      options.paragraph = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

function endsWithColon(text: string): boolean {
  return text.trimEnd().endsWith(":");
}

async function collectParagraphs(
  startIndex: number,
  totalParagraphs: number
): Promise<{ paragraphs: string[]; count: number }> {
  const paragraphs: string[] = [];
  let index = startIndex;

  while (index < totalParagraphs) {
    const paragraph = await getParagraph(index);
    if (!paragraph) break;

    paragraphs.push(paragraph);
    index++;

    // If this paragraph doesn't end with colon, stop collecting
    if (!endsWithColon(paragraph)) {
      break;
    }
  }

  return { paragraphs, count: paragraphs.length };
}

async function main() {
  const options = parseArgs();
  const state = await loadState();

  // Determine which paragraph to post
  const paragraphIndex = options.paragraph ?? state.currentParagraph;
  const totalParagraphs = await getTotalParagraphs();

  console.log(`Starting at paragraph ${paragraphIndex + 1} of ${totalParagraphs}`);

  if (paragraphIndex >= totalParagraphs) {
    console.log("Reached end of book!");
    return;
  }

  // Collect paragraphs (including continuations after colons)
  const { paragraphs, count } = await collectParagraphs(paragraphIndex, totalParagraphs);

  if (paragraphs.length === 0) {
    console.error("Failed to get paragraph");
    process.exit(1);
  }

  // Split each paragraph and combine all chunks
  const allChunks: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const chunks = splitIntoPostChunks(para);

    console.log(`\n--- Paragraph ${paragraphIndex + i + 1} ---`);
    console.log(`Original length: ${countGraphemes(para)} graphemes`);
    console.log(`Split into ${chunks.length} chunk(s)`);

    allChunks.push(...chunks);
  }

  // Group chunks into threads of max 4, avoiding breaks within quotes
  const threads = groupChunksIntoThreads(allChunks);

  console.log(`\n=== Total: ${count} paragraph(s), ${allChunks.length} post(s), ${threads.length} thread(s) ===\n`);

  for (let t = 0; t < threads.length; t++) {
    const thread = threads[t];
    console.log(`--- Thread ${t + 1}/${threads.length} (${thread.length} posts) ---`);
    for (let i = 0; i < thread.length; i++) {
      console.log(`  [${i + 1}/${thread.length}] (${countGraphemes(thread[i])} chars):`);
      console.log(`  ${thread[i]}`);
      console.log();
    }
  }

  if (options.dryRun) {
    console.log("DRY RUN - not posting");
    return;
  }

  // Post each thread to Bluesky
  let lastUri = "";
  for (let t = 0; t < threads.length; t++) {
    console.log(`Posting thread ${t + 1}/${threads.length}...`);
    const result = await post(threads[t]);
    console.log(`Posted! URI: ${result.uri}`);
    lastUri = result.uri;
  }

  // Update state
  const newPosition = paragraphIndex + count;
  state.currentParagraph = newPosition;
  state.lastPostUri = lastUri;
  state.lastPostAt = new Date().toISOString();
  await saveState(state);
  console.log(`Advanced to paragraph ${newPosition + 1} (consumed ${count} paragraph(s))`);

  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
