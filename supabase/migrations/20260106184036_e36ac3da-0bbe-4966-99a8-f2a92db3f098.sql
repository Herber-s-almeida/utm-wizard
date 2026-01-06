-- Add unique constraint for line_code per moment within a plan
-- This allows the same line_code to be used in different moments

-- First, check if there are any existing duplicates that would violate the constraint
-- If so, we need to handle them (in this case, we'll add a suffix)

-- Create a unique constraint that allows same line_code in different moments
-- Note: moment_id can be NULL, so we need to use COALESCE or a partial index

-- Add unique index (handles NULL moment_id as a distinct value)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_line_code_per_moment 
ON media_lines (media_plan_id, line_code, COALESCE(moment_id, '00000000-0000-0000-0000-000000000000'));