import InviteForm from "@/components/InviteForm";

// The invitation token is only known when someone opens a link, so this route
// cannot be prerendered at build time.
export const instant = false;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteForm token={token} />;
}
