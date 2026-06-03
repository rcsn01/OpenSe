import { Bot, Boxes, Palette, type LucideIcon, Workflow } from "lucide-react";

export type SwitchableAppKey = "ass" | "etl" | "stoqr" | "ui-design";

export const SWITCHABLE_APP_ICONS: Record<SwitchableAppKey, LucideIcon> = {
  ass: Bot,
  etl: Workflow,
  stoqr: Boxes,
  "ui-design": Palette,
};
