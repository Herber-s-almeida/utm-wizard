
-- Fix 1: profiles table - restrict to own profile only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix 2: financial_documents - restrict to users with finance roles or plan access
DROP POLICY IF EXISTS "Users can view financial documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can view their own financial documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Finance users can view all documents" ON public.financial_documents;

-- Allow users to view documents they created
CREATE POLICY "Users can view their own financial documents" 
ON public.financial_documents 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users with finance roles to view all documents for plans they have access to
CREATE POLICY "Finance users can view documents for accessible plans" 
ON public.financial_documents 
FOR SELECT 
USING (
  public.has_finance_role(auth.uid(), NULL)
  AND public.has_plan_role(media_plan_id, auth.uid(), NULL)
);

-- Allow plan owners and editors to view financial documents
CREATE POLICY "Plan members can view plan financial documents" 
ON public.financial_documents 
FOR SELECT 
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
);
