
-- Create cost_centers table
CREATE TABLE public.finance_cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (code || ' - ' || name) STORED,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create teams table
CREATE TABLE public.finance_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create financial_accounts table
CREATE TABLE public.finance_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create packages table
CREATE TABLE public.finance_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create macro_classifications table
CREATE TABLE public.finance_macro_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create expense_classifications table
CREATE TABLE public.finance_expense_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  macro_classification_id UUID REFERENCES public.finance_macro_classifications(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create request_types table
CREATE TABLE public.finance_request_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.finance_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_macro_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expense_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_request_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
CREATE POLICY "Users can view their own finance_cost_centers" ON public.finance_cost_centers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_cost_centers" ON public.finance_cost_centers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_cost_centers" ON public.finance_cost_centers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_cost_centers" ON public.finance_cost_centers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own finance_teams" ON public.finance_teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_teams" ON public.finance_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_teams" ON public.finance_teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_teams" ON public.finance_teams FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own finance_accounts" ON public.finance_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_accounts" ON public.finance_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_accounts" ON public.finance_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_accounts" ON public.finance_accounts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own finance_packages" ON public.finance_packages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_packages" ON public.finance_packages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_packages" ON public.finance_packages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_packages" ON public.finance_packages FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own finance_macro_classifications" ON public.finance_macro_classifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_macro_classifications" ON public.finance_macro_classifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_macro_classifications" ON public.finance_macro_classifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_macro_classifications" ON public.finance_macro_classifications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own finance_expense_classifications" ON public.finance_expense_classifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_expense_classifications" ON public.finance_expense_classifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_expense_classifications" ON public.finance_expense_classifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_expense_classifications" ON public.finance_expense_classifications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own finance_request_types" ON public.finance_request_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance_request_types" ON public.finance_request_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance_request_types" ON public.finance_request_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance_request_types" ON public.finance_request_types FOR DELETE USING (auth.uid() = user_id);
