import { Boxes, ClipboardList, Palette, type LucideIcon, Workflow } from "lucide-react";
import type { FirstPartyAppCode } from "@repo/shared/app-registry";

export type SwitchableAppKey = FirstPartyAppCode;

export type AppBrandIconKey = SwitchableAppKey | "ui-design";

export const SWITCHABLE_APP_ICONS: Record<AppBrandIconKey, LucideIcon> = {
  etl: Workflow,
  "open-kb": ClipboardList,
  stoqr: Boxes,
  "ui-design": Palette,
};
