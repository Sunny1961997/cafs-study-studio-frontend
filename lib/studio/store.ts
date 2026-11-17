"use client";

// Client store for the learner state (the old localStorage keys, e.g. cafs_studio_v4_draft_600).
// Seeded once from the state API, then every change is written back (debounced).
// Values are strings, exactly like localStorage; the hooks below add JSON parsing.

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { getToken } from "@/lib/api";
import { STATE_URL, fetchStudioState } from "@/lib/studioState";

const map = new Map<string, string>();
const listeners = new Set<() => void>();
let pending: Record<string, string | null> = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function flush() {
  timer = null;
  const set = pending;
  pending = {};
  if (!Object.keys(set).length) return;
  fetch(STATE_URL, {
    method: "PUT",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` },
    body: JSON.stringify({ set }),
  }).catch(() => {});
}

/** Loads the state from the API (once). Safe to call from several components. */
export function initStore(): Promise<void> {
  if (!initPromise) {
    initPromise = fetchStudioState().then((state) => {
      for (const [key, value] of Object.entries(state)) map.set(key, value);
      notify();
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", () => {
          if (timer) clearTimeout(timer);
          flush();
        });
      }
    });
  }
  return initPromise;
}

export function getItem(key: string): string | null {
  return map.get(key) ?? null;
}

/** Stores a string (or removes the key when `value` is null) and queues the API write. */
export function setItem(key: string, value: string | null) {
  if (value === null) map.delete(key);
  else map.set(key, value);
  pending[key] = value;
  if (!timer) timer = setTimeout(flush, 300);
  notify();
}

/** Forces a pending write out now (e.g. before leaving the page). */
export function flushStore() {
  if (timer) clearTimeout(timer);
  flush();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The raw string stored under `key` (null when unset). Re-renders on change. */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => map.get(key) ?? null,
    () => null,
  );
}

/**
 * JSON value stored under `key`. `fallback` is used when the key is unset or unparsable;
 * pass a stable value (module constant) so it does not re-create on every render.
 * The setter accepts a value or an updater and writes through to the API.
 */
export function useStoredJSON<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const raw = useStoredString(key);
  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const currentRaw = map.get(key) ?? null;
      let current = fallback;
      if (currentRaw !== null) {
        try {
          current = JSON.parse(currentRaw) as T;
        } catch {
          current = fallback;
        }
      }
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      setItem(key, JSON.stringify(resolved));
    },
    [key, fallback],
  );

  return [value, set];
}
