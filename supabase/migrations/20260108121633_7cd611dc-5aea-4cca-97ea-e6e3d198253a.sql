-- Add UPDATE and DELETE policies for creative_types table
CREATE POLICY "Authenticated users can update creative types" 
ON public.creative_types 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete creative types" 
ON public.creative_types 
FOR DELETE 
USING (auth.uid() IS NOT NULL);