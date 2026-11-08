import { IntegratedKnowledgePage } from "@/components/studio/pages/IntegratedKnowledge";

// Client-driven app: opt out of the dev-time instant-navigation validation.
export const instant = false;

export default function Page() {
  return <IntegratedKnowledgePage />;
}
