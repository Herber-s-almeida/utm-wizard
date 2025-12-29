-- Create status_transitions table
CREATE TABLE IF NOT EXISTS public.status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status_id UUID REFERENCES statuses(id) ON DELETE CASCADE,
  to_status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  required_roles app_role[] NOT NULL DEFAULT '{owner}',
  requires_comment BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_status_id, to_status_id, user_id)
);

-- Enable RLS
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own and system transitions" ON public.status_transitions;
DROP POLICY IF EXISTS "Users can create own transitions" ON public.status_transitions;
DROP POLICY IF EXISTS "Users can update own non-system transitions" ON public.status_transitions;
DROP POLICY IF EXISTS "Users can delete own non-system transitions" ON public.status_transitions;

-- RLS policies for status_transitions
CREATE POLICY "Users can view own and system transitions"
ON public.status_transitions
FOR SELECT
USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can create own transitions"
ON public.status_transitions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own non-system transitions"
ON public.status_transitions
FOR UPDATE
USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own non-system transitions"
ON public.status_transitions
FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- Create plan_status_history table
CREATE TABLE IF NOT EXISTS public.plan_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID NOT NULL REFERENCES media_plans(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  comment TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view history of accessible plans" ON public.plan_status_history;
DROP POLICY IF EXISTS "Users can insert history for accessible plans" ON public.plan_status_history;

-- RLS policies for plan_status_history
CREATE POLICY "Users can view history of accessible plans"
ON public.plan_status_history
FOR SELECT
USING (has_plan_role(media_plan_id, auth.uid(), NULL::app_role[]));

CREATE POLICY "Users can insert history for accessible plans"
ON public.plan_status_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by AND has_plan_role(media_plan_id, auth.uid(), NULL::app_role[]));

-- Create or replace function to check if transition is valid
CREATE OR REPLACE FUNCTION public.can_transition_status(
  _plan_id UUID,
  _from_status TEXT,
  _to_status TEXT,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM status_transitions st
    JOIN statuses to_s ON to_s.id = st.to_status_id
    LEFT JOIN statuses from_s ON from_s.id = st.from_status_id
    WHERE (
      (st.from_status_id IS NULL AND _from_status IS NULL)
      OR from_s.name = _from_status
    )
    AND to_s.name = _to_status
    AND (
      st.is_system = true 
      OR st.user_id = _user_id
    )
    AND (
      has_plan_role(_plan_id, _user_id, st.required_roles)
      OR (SELECT user_id FROM media_plans WHERE id = _plan_id) = _user_id
    )
  )
$$;

-- Create or replace function to get valid transitions for a user
CREATE OR REPLACE FUNCTION public.get_valid_transitions(
  _plan_id UUID,
  _from_status TEXT,
  _user_id UUID
)
RETURNS TABLE (
  to_status TEXT,
  to_status_id UUID,
  requires_comment BOOLEAN,
  required_roles app_role[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.name as to_status,
    st.to_status_id,
    st.requires_comment,
    st.required_roles
  FROM status_transitions st
  JOIN statuses s ON s.id = st.to_status_id
  LEFT JOIN statuses from_s ON from_s.id = st.from_status_id
  WHERE (
    (st.from_status_id IS NULL AND _from_status IS NULL)
    OR from_s.name = _from_status
  )
  AND (
    st.is_system = true 
    OR st.user_id = _user_id
  )
  AND (
    has_plan_role(_plan_id, _user_id, st.required_roles)
    OR (SELECT user_id FROM media_plans WHERE id = _plan_id) = _user_id
  )
$$;