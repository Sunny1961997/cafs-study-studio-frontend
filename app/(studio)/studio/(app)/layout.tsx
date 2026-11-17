import { Shell } from "@/components/studio/Shell";
import { StudioProvider } from "@/lib/studio/StudioProvider";

// The studio is a signed-in, client-driven app (content and learner state load in the
// browser), so the dev-time "instant navigation" validation does not apply to it.
export const instant = false;

export default function StudioAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <Shell>{children}</Shell>
    </StudioProvider>
  );
}
