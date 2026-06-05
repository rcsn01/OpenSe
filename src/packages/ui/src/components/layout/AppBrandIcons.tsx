import { Boxes, Palette, type LucideIcon, Workflow } from "lucide-react";
import type { SwitchableAppKey } from "@repo/shared/switchable-apps";

export type { SwitchableAppKey } from "@repo/shared/switchable-apps";

export type AppBrandIconKey = SwitchableAppKey | "ui-design";

export const SWITCHABLE_APP_ICONS: Record<AppBrandIconKey, LucideIcon> = {
  etl: Workflow,
  stoqr: Boxes,
  "ui-design": Palette,
};
