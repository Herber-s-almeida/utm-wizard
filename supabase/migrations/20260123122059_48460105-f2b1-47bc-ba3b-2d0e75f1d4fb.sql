-- Fix RLS policies: remove overly permissive "FOR ALL" and create specific policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users with plan edit access can manage followers" ON public.media_plan_followers;
DROP POLICY IF EXISTS "Users with plan edit access can update notification state" ON public.media_plan_notification_state;

-- Create specific policies for media_plan_followers
CREATE POLICY "Users with plan edit access can insert followers"
ON public.media_plan_followers FOR INSERT
WITH CHECK (public.can_edit_plan(media_plan_id));

CREATE POLICY "Users with plan edit access can update followers"
ON public.media_plan_followers FOR UPDATE
USING (public.can_edit_plan(media_plan_id));

CREATE POLICY "Users with plan edit access can delete followers"
ON public.media_plan_followers FOR DELETE
USING (public.can_edit_plan(media_plan_id));

-- Create specific policies for media_plan_notification_state
CREATE POLICY "Users with plan edit access can insert notification state"
ON public.media_plan_notification_state FOR INSERT
WITH CHECK (public.can_edit_plan(media_plan_id));

CREATE POLICY "Users with plan edit access can update notification state"
ON public.media_plan_notification_state FOR UPDATE
USING (public.can_edit_plan(media_plan_id));

CREATE POLICY "Users with plan edit access can delete notification state"
ON public.media_plan_notification_state FOR DELETE
USING (public.can_edit_plan(media_plan_id));