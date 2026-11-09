"use client";

import { KitFlow } from "@/components/studio/kit/KitFlow";
import { KitLibrary } from "@/components/studio/kit/KitLibrary";

export function TypologiesPage() {
  return (
    <KitFlow home="typologies">
      <KitLibrary kind="typologies" />
    </KitFlow>
  );
}
