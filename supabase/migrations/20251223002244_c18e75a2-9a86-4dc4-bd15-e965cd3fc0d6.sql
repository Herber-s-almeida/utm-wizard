-- Create table for monthly budget allocations per media line
CREATE TABLE public.media_line_monthly_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_line_id UUID NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  month_date DATE NOT NULL, -- First day of the month (e.g., 2025-01-01 for January 2025)
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique combination of line and month
  UNIQUE(media_line_id, month_date)
);

-- Enable Row Level Security
ALTER TABLE public.media_line_monthly_budgets ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can CRUD own line monthly budgets"
ON public.media_line_monthly_budgets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_media_line_monthly_budgets_updated_at
BEFORE UPDATE ON public.media_line_monthly_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_media_line_monthly_budgets_line_id ON public.media_line_monthly_budgets(media_line_id);
CREATE INDEX idx_media_line_monthly_budgets_month_date ON public.media_line_monthly_budgets(month_date);