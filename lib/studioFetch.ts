import { getToken } from "@/lib/api";
import { STUDIO_DATASETS, STUDIO_TEXT, type StudioData } from "@/lib/studioData";

// Where the datasets are served from. Defaults to the JSON files in public/data;
// point NEXT_PUBLIC_STUDIO_DATA_URL at the backend (e.g. http://localhost:8000/api/studio/data)
// once it serves the same `{key}.json` paths.
const DATA_URL = process.env.NEXT_PUBLIC_STUDIO_DATA_URL || "/data";

/** Loads datasets from DATA_URL. Missing or failed ones are simply omitted. */
export async function fetchStudioData(): Promise<StudioData> {
  const token = getToken();
  const entries = await Promise.all(
    [...STUDIO_DATASETS, ...STUDIO_TEXT].map(async ({ key }) => {
      try {
        const response = await fetch(`${DATA_URL}/${key}.json`, {
          headers: { Accept: "application/json", Authorization: token ? `Bearer ${token}` : "" },
          cache: "no-store",
        });
        if (!response.ok) return null;
        return [key, await response.json()] as const;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((entry) => entry !== null));
}
