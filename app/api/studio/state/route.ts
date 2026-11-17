import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Stand-in for the Laravel backend: stores each learner's studio state
// (progress, saves, attempts, drafts, theme) in a JSON file keyed by their token.
// Swap by pointing NEXT_PUBLIC_STUDIO_STATE_URL at the real API.

const DIR = path.join(process.cwd(), ".studio-state");

function fileFor(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return path.join(DIR, `${createHash("sha256").update(token).digest("hex").slice(0, 32)}.json`);
}

async function load(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const file = fileFor(request);
  if (!file) return Response.json({ message: "Unauthenticated." }, { status: 401 });
  return Response.json({ state: await load(file) });
}

// Body: { set: { key: string | null } } — null removes the key.
export async function PUT(request: Request) {
  const file = fileFor(request);
  if (!file) return Response.json({ message: "Unauthenticated." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { set?: Record<string, string | null> } | null;
  if (!body || typeof body.set !== "object" || body.set === null) {
    return Response.json({ message: "Invalid payload." }, { status: 422 });
  }

  const state = await load(file);
  for (const [key, value] of Object.entries(body.set)) {
    if (typeof value === "string") state[key] = value;
    else if (value === null) delete state[key];
  }
  await mkdir(DIR, { recursive: true });
  await writeFile(file, JSON.stringify(state));
  return Response.json({ ok: true });
}
