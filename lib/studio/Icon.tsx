import { ICON_PATHS } from "@/lib/studio/iconPaths";

/** Stroke icon from the studio's icon set (same SVG as the original ico()). */
export function Icon({ name }: { name: string }) {
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || ICON_PATHS.info }}
    />
  );
}
