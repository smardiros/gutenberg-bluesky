import { BskyAgent } from "@atproto/api";

let agent: BskyAgent | null = null;

export async function login(): Promise<BskyAgent> {
  if (agent) {
    return agent;
  }

  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_PASSWORD;

  if (!handle || !password) {
    throw new Error(
      "Missing BLUESKY_HANDLE or BLUESKY_PASSWORD environment variables"
    );
  }

  agent = new BskyAgent({ service: "https://bsky.social" });

  await agent.login({
    identifier: handle,
    password: password,
  });

  console.log(`Logged in as ${handle}`);
  return agent;
}

export interface PostResult {
  uri: string;
  cid: string;
}

export async function postSingle(text: string): Promise<PostResult> {
  const bsky = await login();
  const result = await bsky.post({ text });
  return { uri: result.uri, cid: result.cid };
}

export async function postThread(chunks: string[]): Promise<PostResult> {
  if (chunks.length === 0) {
    throw new Error("Cannot post empty thread");
  }

  if (chunks.length === 1) {
    return postSingle(chunks[0]);
  }

  const bsky = await login();

  // Post first chunk
  let parent = await bsky.post({ text: chunks[0] });
  let root = { uri: parent.uri, cid: parent.cid };

  // Post remaining chunks as replies
  for (let i = 1; i < chunks.length; i++) {
    const reply = await bsky.post({
      text: chunks[i],
      reply: {
        root: root,
        parent: { uri: parent.uri, cid: parent.cid },
      },
    });
    parent = reply;
  }

  // Return the first post's info
  return root;
}

export async function post(chunks: string[]): Promise<PostResult> {
  if (chunks.length === 1) {
    return postSingle(chunks[0]);
  }
  return postThread(chunks);
}
