import { LibraryPage } from "@/components/studio/pages/Library";

// Client-driven app: opt out of the dev-time instant-navigation validation.
export const instant = false;

export default function Page() {
  return <LibraryPage />;
}
