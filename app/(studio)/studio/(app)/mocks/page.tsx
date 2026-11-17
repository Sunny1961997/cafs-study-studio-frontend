import { MocksPage } from "@/components/studio/pages/Mocks";

// Client-driven app: opt out of the dev-time instant-navigation validation.
export const instant = false;

export default function Page() {
  return <MocksPage />;
}
