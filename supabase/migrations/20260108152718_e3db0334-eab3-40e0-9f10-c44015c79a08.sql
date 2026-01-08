-- Add soft delete support for media_lines
ALTER TABLE public.media_lines 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Add index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_media_lines_deleted_at 
ON public.media_lines(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update RLS policies for media_lines to allow system admin operations
DROP POLICY IF EXISTS "Users can delete their own media lines" ON public.media_lines;
CREATE POLICY "Users can delete their own media lines"
ON public.media_lines
FOR DELETE
USING (
  user_id = auth.uid() 
  OR is_system_admin(auth.uid())
  OR has_plan_role(media_plan_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own media lines" ON public.media_lines;
CREATE POLICY "Users can update their own media lines"
ON public.media_lines
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR is_system_admin(auth.uid())
  OR has_plan_role(media_plan_id, auth.uid())
);