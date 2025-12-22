-- Add is_system column to plan_subdivisions
ALTER TABLE public.plan_subdivisions 
ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Add is_system column to moments
ALTER TABLE public.moments 
ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Add is_system column to funnel_stages
ALTER TABLE public.funnel_stages 
ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Drop existing RLS policies for plan_subdivisions
DROP POLICY IF EXISTS "Users can CRUD own subdivisions" ON public.plan_subdivisions;

-- Create new RLS policies for plan_subdivisions
CREATE POLICY "Users can view own and system subdivisions" 
ON public.plan_subdivisions 
FOR SELECT 
USING ((auth.uid() = user_id) OR (is_system = true));

CREATE POLICY "Users can create own subdivisions" 
ON public.plan_subdivisions 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can update own non-system subdivisions" 
ON public.plan_subdivisions 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can delete own non-system subdivisions" 
ON public.plan_subdivisions 
FOR DELETE 
USING ((auth.uid() = user_id) AND (is_system = false));

-- Drop existing RLS policies for moments
DROP POLICY IF EXISTS "Users can CRUD own moments" ON public.moments;

-- Create new RLS policies for moments
CREATE POLICY "Users can view own and system moments" 
ON public.moments 
FOR SELECT 
USING ((auth.uid() = user_id) OR (is_system = true));

CREATE POLICY "Users can create own moments" 
ON public.moments 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can update own non-system moments" 
ON public.moments 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can delete own non-system moments" 
ON public.moments 
FOR DELETE 
USING ((auth.uid() = user_id) AND (is_system = false));

-- Drop existing RLS policies for funnel_stages
DROP POLICY IF EXISTS "Users can CRUD own funnel_stages" ON public.funnel_stages;

-- Create new RLS policies for funnel_stages
CREATE POLICY "Users can view own and system funnel_stages" 
ON public.funnel_stages 
FOR SELECT 
USING ((auth.uid() = user_id) OR (is_system = true));

CREATE POLICY "Users can create own funnel_stages" 
ON public.funnel_stages 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can update own non-system funnel_stages" 
ON public.funnel_stages 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (is_system = false));

CREATE POLICY "Users can delete own non-system funnel_stages" 
ON public.funnel_stages 
FOR DELETE 
USING ((auth.uid() = user_id) AND (is_system = false));