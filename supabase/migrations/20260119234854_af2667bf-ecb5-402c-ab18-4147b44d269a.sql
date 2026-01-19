-- FASE 1: Remover policies antigas baseadas em user_id
-- Manter apenas as policies "Environment ..." baseadas em environment_id

-- behavioral_segmentations
DROP POLICY IF EXISTS "Users can delete own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can insert segmentations in accessible environments" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can manage own behavioral_segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can update own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can view accessible segmentations" ON public.behavioral_segmentations;

-- channels
DROP POLICY IF EXISTS "Users can delete own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can insert channels in accessible environments" ON public.channels;
DROP POLICY IF EXISTS "Users can manage own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can update own channels" ON public.channels;

-- clients
DROP POLICY IF EXISTS "Users can create clients in accessible environments" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;

-- creative_templates
DROP POLICY IF EXISTS "Users can delete own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can insert templates in accessible environments" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can manage own creative_templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can view accessible templates" ON public.creative_templates;

-- creative_type_specifications
DROP POLICY IF EXISTS "Users can delete own creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can insert own creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can insert specifications in accessible environments" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can manage own specifications" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can update own creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can view accessible creative type specs" ON public.creative_type_specifications;

-- custom_kpis
DROP POLICY IF EXISTS "Users can delete own custom_kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can insert custom_kpis in accessible environments" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can insert own custom_kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can manage own kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can update own custom_kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can view accessible custom_kpis" ON public.custom_kpis;

-- data_sources
DROP POLICY IF EXISTS "Users can delete own data_sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can insert data_sources in accessible environments" ON public.data_sources;
DROP POLICY IF EXISTS "Users can insert own data_sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can manage own data sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can update own data_sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can view accessible data_sources" ON public.data_sources;

-- finance tables
DROP POLICY IF EXISTS "Users can delete own finance_account_managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can insert finance_account_managers in accessible environments" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can insert own finance_account_managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can update own finance_account_managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can view accessible finance_account_managers" ON public.finance_account_managers;

DROP POLICY IF EXISTS "Users can delete own finance_accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can insert finance_accounts in accessible environments" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can insert own finance_accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can update own finance_accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can view accessible finance_accounts" ON public.finance_accounts;

DROP POLICY IF EXISTS "Users can delete own finance_campaign_projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can insert finance_campaign_projects in accessible environments" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can insert own finance_campaign_projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can update own finance_campaign_projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can view accessible finance_campaign_projects" ON public.finance_campaign_projects;

DROP POLICY IF EXISTS "Users can delete own finance_cost_centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can insert finance_cost_centers in accessible environments" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can insert own finance_cost_centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can update own finance_cost_centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can view accessible finance_cost_centers" ON public.finance_cost_centers;

DROP POLICY IF EXISTS "Users can delete own finance_document_types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can insert finance_document_types in accessible environments" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can insert own finance_document_types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can update own finance_document_types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can view accessible finance_document_types" ON public.finance_document_types;

DROP POLICY IF EXISTS "Users can delete own finance_expense_classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can insert finance_expense_classifications in accessible environments" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can insert own finance_expense_classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can update own finance_expense_classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can view accessible finance_expense_classifications" ON public.finance_expense_classifications;

DROP POLICY IF EXISTS "Users can delete own finance_macro_classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can insert finance_macro_classifications in accessible environments" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can insert own finance_macro_classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can update own finance_macro_classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can view accessible finance_macro_classifications" ON public.finance_macro_classifications;

DROP POLICY IF EXISTS "Users can delete own finance_packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can insert finance_packages in accessible environments" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can insert own finance_packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can update own finance_packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can view accessible finance_packages" ON public.finance_packages;

DROP POLICY IF EXISTS "Users can delete own finance_request_types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can insert finance_request_types in accessible environments" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can insert own finance_request_types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can update own finance_request_types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can view accessible finance_request_types" ON public.finance_request_types;

DROP POLICY IF EXISTS "Users can delete own finance_statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can insert finance_statuses in accessible environments" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can insert own finance_statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can update own finance_statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can view accessible finance_statuses" ON public.finance_statuses;

DROP POLICY IF EXISTS "Users can delete own finance_teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can insert finance_teams in accessible environments" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can insert own finance_teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can update own finance_teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can view accessible finance_teams" ON public.finance_teams;

-- financial tables
DROP POLICY IF EXISTS "Users can delete own financial_actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can insert financial_actuals in accessible environments" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can insert own financial_actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can update own financial_actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can view accessible financial_actuals" ON public.financial_actuals;

DROP POLICY IF EXISTS "Users can delete own financial_alert_configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can insert financial_alert_configs in accessible environments" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can insert own financial_alert_configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can update own financial_alert_configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can view accessible financial_alert_configs" ON public.financial_alert_configs;

DROP POLICY IF EXISTS "Users can delete own financial_documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can insert financial_documents in accessible environments" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can insert own financial_documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can update own financial_documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can view accessible financial_documents" ON public.financial_documents;

DROP POLICY IF EXISTS "Users can delete own financial_forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can insert financial_forecasts in accessible environments" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can insert own financial_forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can update own financial_forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can view accessible financial_forecasts" ON public.financial_forecasts;

DROP POLICY IF EXISTS "Users can delete own financial_payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can insert financial_payments in accessible environments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can insert own financial_payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can update own financial_payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can view accessible financial_payments" ON public.financial_payments;

DROP POLICY IF EXISTS "Users can delete own financial_revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can insert financial_revenues in accessible environments" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can insert own financial_revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can update own financial_revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can view accessible financial_revenues" ON public.financial_revenues;

DROP POLICY IF EXISTS "Users can delete own financial_vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can insert financial_vendors in accessible environments" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can insert own financial_vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can update own financial_vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can view accessible financial_vendors" ON public.financial_vendors;

-- format tables
DROP POLICY IF EXISTS "Users can delete own format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can insert format_creative_types in accessible environments" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can insert own format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can update own format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can view accessible format_creative_types" ON public.format_creative_types;

DROP POLICY IF EXISTS "Users can delete own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can insert formats in accessible environments" ON public.formats;
DROP POLICY IF EXISTS "Users can insert own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can update own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can view accessible formats" ON public.formats;

-- funnel_stages
DROP POLICY IF EXISTS "Users can delete own funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can insert funnel_stages in accessible environments" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can insert own funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can update own funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can view accessible funnel_stages" ON public.funnel_stages;

-- line_detail tables
DROP POLICY IF EXISTS "Users can delete own line_detail_insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can insert line_detail_insertions in accessible environments" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can insert own line_detail_insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can update own line_detail_insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can view accessible line_detail_insertions" ON public.line_detail_insertions;

DROP POLICY IF EXISTS "Users can delete own line_detail_items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can insert line_detail_items in accessible environments" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can insert own line_detail_items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can update own line_detail_items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can view accessible line_detail_items" ON public.line_detail_items;

DROP POLICY IF EXISTS "Users can delete own line_detail_types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can insert line_detail_types in accessible environments" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can insert own line_detail_types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can update own line_detail_types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can view accessible line_detail_types" ON public.line_detail_types;

DROP POLICY IF EXISTS "Users can delete own line_details" ON public.line_details;
DROP POLICY IF EXISTS "Users can insert line_details in accessible environments" ON public.line_details;
DROP POLICY IF EXISTS "Users can insert own line_details" ON public.line_details;
DROP POLICY IF EXISTS "Users can update own line_details" ON public.line_details;
DROP POLICY IF EXISTS "Users can view accessible line_details" ON public.line_details;

-- line_targets
DROP POLICY IF EXISTS "Users can delete own line_targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can insert line_targets in accessible environments" ON public.line_targets;
DROP POLICY IF EXISTS "Users can insert own line_targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can update own line_targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can view accessible line_targets" ON public.line_targets;

-- media tables
DROP POLICY IF EXISTS "Users can delete own media_creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can insert media_creatives in accessible environments" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can insert own media_creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can update own media_creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can view accessible media_creatives" ON public.media_creatives;

DROP POLICY IF EXISTS "Users can delete own media_line_monthly_budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can insert media_line_monthly_budgets in accessible environments" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can insert own media_line_monthly_budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can update own media_line_monthly_budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can view accessible media_line_monthly_budgets" ON public.media_line_monthly_budgets;

DROP POLICY IF EXISTS "Users can delete own media_lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can insert media_lines in accessible environments" ON public.media_lines;
DROP POLICY IF EXISTS "Users can insert own media_lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can update own media_lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can view accessible media_lines" ON public.media_lines;

DROP POLICY IF EXISTS "Users can delete own media_objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can insert media_objectives in accessible environments" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can insert own media_objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can update own media_objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can view accessible media_objectives" ON public.media_objectives;

DROP POLICY IF EXISTS "Users can delete own media_plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can insert media_plans in accessible environments" ON public.media_plans;
DROP POLICY IF EXISTS "Users can insert own media_plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can update own media_plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can view accessible media_plans" ON public.media_plans;

-- mediums
DROP POLICY IF EXISTS "Users can delete own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can insert mediums in accessible environments" ON public.mediums;
DROP POLICY IF EXISTS "Users can insert own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can update own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can view accessible mediums" ON public.mediums;

-- moments
DROP POLICY IF EXISTS "Users can delete own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can insert moments in accessible environments" ON public.moments;
DROP POLICY IF EXISTS "Users can insert own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can update own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can view accessible moments" ON public.moments;

-- plan tables
DROP POLICY IF EXISTS "Users can delete own plan_budget_distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can insert plan_budget_distributions in accessible environments" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can insert own plan_budget_distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can update own plan_budget_distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can view accessible plan_budget_distributions" ON public.plan_budget_distributions;

DROP POLICY IF EXISTS "Users can delete own plan_custom_kpis" ON public.plan_custom_kpis;
DROP POLICY IF EXISTS "Users can insert own plan_custom_kpis" ON public.plan_custom_kpis;
DROP POLICY IF EXISTS "Users can update own plan_custom_kpis" ON public.plan_custom_kpis;
DROP POLICY IF EXISTS "Users can view own plan_custom_kpis" ON public.plan_custom_kpis;

DROP POLICY IF EXISTS "Users can delete own plan_subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can insert plan_subdivisions in accessible environments" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can insert own plan_subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can update own plan_subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can view accessible plan_subdivisions" ON public.plan_subdivisions;

-- statuses
DROP POLICY IF EXISTS "Users can delete own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert statuses in accessible environments" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can update own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can view accessible statuses" ON public.statuses;

-- targets
DROP POLICY IF EXISTS "Users can delete own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can insert targets in accessible environments" ON public.targets;
DROP POLICY IF EXISTS "Users can insert own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can update own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can view accessible targets" ON public.targets;

-- vehicles
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles in accessible environments" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view accessible vehicles" ON public.vehicles;