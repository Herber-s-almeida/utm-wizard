-- Add line_code column to media_lines table
ALTER TABLE public.media_lines 
ADD COLUMN line_code TEXT NULL;

-- Create index for faster lookups within a plan
CREATE INDEX idx_media_lines_plan_code ON public.media_lines(media_plan_id, line_code);