
-- Add Google Analytics metrics columns to report_data
ALTER TABLE public.report_data ADD COLUMN IF NOT EXISTS total_users numeric DEFAULT 0;
ALTER TABLE public.report_data ADD COLUMN IF NOT EXISTS new_users numeric DEFAULT 0;
ALTER TABLE public.report_data ADD COLUMN IF NOT EXISTS engaged_sessions numeric DEFAULT 0;
