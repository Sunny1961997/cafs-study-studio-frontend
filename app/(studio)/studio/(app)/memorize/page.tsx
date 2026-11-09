import { MemorizePage } from "@/components/studio/pages/Memorize";

// Client-driven app: opt out of the dev-time instant-navigation validation.
export const instant = false;

export default function Page() {
  return <MemorizePage />;
}
