-- Add observation column to specification_dimensions table
ALTER TABLE public.specification_dimensions 
ADD COLUMN IF NOT EXISTS observation TEXT;