import design from "./cafs-page-design.json";

export const cafs = design;

const links = design.project.externalLinks;

// Student Login points at the existing Academy login, which lives in this app.
export const hrefs = {
  studentLogin: "/login",
  fclHome: links.fclHome,
  support: links.support,
  privacy: links.privacy,
  landing: "/cafs",
  pricing: "/cafs/pricing",
} as const;

export function formatUsd(minor: number) {
  return `US$${(minor / 100).toFixed(2)}`;
}
