import type { Metadata } from "next";
import "./studio/studio.css";

export const metadata: Metadata = {
  title: "Fraud Intelligence Academy | CAFS Study Studio v22 · Integrated Knowledge Edition",
};

// Separate root layout: the studio uses its own stylesheet (extracted from the original
// page) and none of the site-wide Tailwind/global styles.
export default function StudioRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
