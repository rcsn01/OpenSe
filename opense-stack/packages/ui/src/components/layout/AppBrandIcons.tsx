import { Boxes, Palette, type LucideIcon, Workflow } from "lucide-react";

export type SwitchableAppKey = "etl" | "stoqr" | "ui-design";

export const SWITCHABLE_APP_ICONS: Record<SwitchableAppKey, LucideIcon> = {
  etl: Workflow,
  stoqr: Boxes,
  "ui-design": Palette,
};