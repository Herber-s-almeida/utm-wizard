-- =====================================================
-- ROLES AND PERMISSIONS SYSTEM FOR MEDIA PLANS
-- =====================================================

-- 1. Create enum for plan roles
CREATE TYPE public.app_role AS ENUM ('owner', 'editor', 'viewer', 'approver');

-- 2. Create plan_roles table
CREATE TABLE public.plan_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(media_plan_id, user_id)
);

-- Create index for faster queries
CREATE INDEX idx_plan_roles_user_id ON public.plan_roles(user_id);
CREATE INDEX idx_plan_roles_plan_id ON public.plan_roles(media_plan_id);

-- Enable RLS on plan_roles
ALTER TABLE public.plan_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create SECURITY DEFINER function to check plan roles
CREATE OR REPLACE FUNCTION public.has_plan_role(
  _plan_id UUID, 
  _user_id UUID, 
  _roles app_role[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is the original owner (creator) of the plan
    SELECT 1 FROM public.media_plans 
    WHERE id = _plan_id AND user_id = _user_id
  ) 
  OR EXISTS (
    -- Check if user has an assigned role
    SELECT 1 FROM public.plan_roles
    WHERE media_plan_id = _plan_id 
      AND user_id = _user_id
      AND (_roles IS NULL OR role = ANY(_roles))
  )
$$;

-- Helper function to get user's role in a plan
CREATE OR REPLACE FUNCTION public.get_plan_role(_plan_id UUID, _user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.media_plans WHERE id = _plan_id AND user_id = _user_id) 
        THEN 'owner'
      ELSE (SELECT role::text FROM public.plan_roles WHERE media_plan_id = _plan_id AND user_id = _user_id)
    END
$$;

-- 4. RLS Policies for plan_roles table
-- Users can view roles for plans they have access to
CREATE POLICY "Users can view roles for their plans"
ON public.plan_roles
FOR SELECT
USING (
  public.has_plan_role(media_plan_id, auth.uid(), NULL)
);

-- Only owners can manage roles
CREATE POLICY "Owners can insert roles"
ON public.plan_roles
FOR INSERT
WITH CHECK (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role])
  OR EXISTS (SELECT 1 FROM public.media_plans WHERE id = media_plan_id AND user_id = auth.uid())
);

CREATE POLICY "Owners can update roles"
ON public.plan_roles
FOR UPDATE
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role])
  OR EXISTS (SELECT 1 FROM public.media_plans WHERE id = media_plan_id AND user_id = auth.uid())
);

CREATE POLICY "Owners can delete roles"
ON public.plan_roles
FOR DELETE
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role])
  OR EXISTS (SELECT 1 FROM public.media_plans WHERE id = media_plan_id AND user_id = auth.uid())
);

-- 5. Update media_plans RLS policies
DROP POLICY IF EXISTS "Users can CRUD own media plans" ON public.media_plans;

-- SELECT: owner OR has any role in the plan
CREATE POLICY "Users can view own and shared plans"
ON public.media_plans
FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.has_plan_role(id, auth.uid(), NULL)
);

-- INSERT: only authenticated users (they become owner)
CREATE POLICY "Authenticated users can create plans"
ON public.media_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: owner OR editor OR approver
CREATE POLICY "Owners and editors can update plans"
ON public.media_plans
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.has_plan_role(id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role, 'approver'::app_role])
);

-- DELETE: only owner
CREATE POLICY "Only owners can delete plans"
ON public.media_plans
FOR DELETE
USING (user_id = auth.uid());

-- 6. Update media_lines RLS policies
DROP POLICY IF EXISTS "Users can CRUD own media lines" ON public.media_lines;

-- SELECT: based on plan access
CREATE POLICY "Users can view lines of accessible plans"
ON public.media_lines
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_plan_role(media_plan_id, auth.uid(), NULL)
);

-- INSERT: owner or editor of the plan
CREATE POLICY "Owners and editors can create lines"
ON public.media_lines
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM public.media_plans WHERE id = media_plan_id AND user_id = auth.uid())
    OR public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
);

-- UPDATE: owner or editor
CREATE POLICY "Owners and editors can update lines"
ON public.media_lines
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
);

-- DELETE: owner or editor
CREATE POLICY "Owners and editors can delete lines"
ON public.media_lines
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
);

-- 7. Update media_creatives RLS policies
DROP POLICY IF EXISTS "Users can CRUD own creatives" ON public.media_creatives;

-- SELECT: based on line -> plan access
CREATE POLICY "Users can view creatives of accessible plans"
ON public.media_creatives
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = media_line_id
    AND public.has_plan_role(ml.media_plan_id, auth.uid(), NULL)
  )
);

-- INSERT: owner or editor
CREATE POLICY "Owners and editors can create creatives"
ON public.media_creatives
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = media_line_id
    AND (
      ml.user_id = auth.uid()
      OR public.has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
    )
  )
);

-- UPDATE: owner or editor
CREATE POLICY "Owners and editors can update creatives"
ON public.media_creatives
FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = media_line_id
    AND public.has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
);

-- DELETE: owner or editor
CREATE POLICY "Owners and editors can delete creatives"
ON public.media_creatives
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.media_lines ml
    WHERE ml.id = media_line_id
    AND public.has_plan_role(ml.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  )
);