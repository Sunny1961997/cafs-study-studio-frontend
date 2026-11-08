"use client";

/** Reads a query-string value on first client render (studio pages only mount after the provider has loaded). */
export function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}
