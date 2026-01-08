-- Create finance_account_managers (Atendimento - pessoa que solicitou a compra)
CREATE TABLE public.finance_account_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create finance_document_types (Tipo do Documento - boleto, cartão, fatura, recibo, etc)
CREATE TABLE public.finance_document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create finance_statuses (Status - status do financeiro)
CREATE TABLE public.finance_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create finance_campaign_projects (Campanha/Projeto - outras coisas além dos planos)
CREATE TABLE public.finance_campaign_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.finance_account_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_campaign_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_account_managers
CREATE POLICY "Users can view their own account managers" 
ON public.finance_account_managers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own account managers" 
ON public.finance_account_managers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account managers" 
ON public.finance_account_managers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own account managers" 
ON public.finance_account_managers FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for finance_document_types
CREATE POLICY "Users can view their own document types" 
ON public.finance_document_types FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document types" 
ON public.finance_document_types FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document types" 
ON public.finance_document_types FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document types" 
ON public.finance_document_types FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for finance_statuses
CREATE POLICY "Users can view their own finance statuses" 
ON public.finance_statuses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own finance statuses" 
ON public.finance_statuses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own finance statuses" 
ON public.finance_statuses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own finance statuses" 
ON public.finance_statuses FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for finance_campaign_projects
CREATE POLICY "Users can view their own campaign projects" 
ON public.finance_campaign_projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign projects" 
ON public.finance_campaign_projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign projects" 
ON public.finance_campaign_projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign projects" 
ON public.finance_campaign_projects FOR DELETE 
USING (auth.uid() = user_id);