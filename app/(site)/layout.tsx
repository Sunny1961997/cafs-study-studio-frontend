import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAFS Study Studio",
  description: "Fraud Intelligence Academy study studio",
  icons: null,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
