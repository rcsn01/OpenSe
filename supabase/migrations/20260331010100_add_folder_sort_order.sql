-- Add sort_order column to stoqr.folders for drag-and-drop repositioning
ALTER TABLE stoqr.folders ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;
