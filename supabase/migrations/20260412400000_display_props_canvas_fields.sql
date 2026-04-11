ALTER TABLE public.display_props
ADD COLUMN IF NOT EXISTS canvas_x float8,
ADD COLUMN IF NOT EXISTS canvas_y float8,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS angle float8,
ADD COLUMN IF NOT EXISTS length float8,
ADD COLUMN IF NOT EXISTS house_type text;
