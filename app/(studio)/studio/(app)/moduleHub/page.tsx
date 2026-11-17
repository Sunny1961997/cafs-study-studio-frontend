import { ModuleHubPage } from "@/components/studio/pages/ModuleHub";

// Client-driven app: opt out of the dev-time instant-navigation validation.
export const instant = false;

export default function Page() {
  return <ModuleHubPage />;
}
