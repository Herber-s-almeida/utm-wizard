

# Arquivo de Migracao SQL Completo - Ordem de Dependencias

## Objetivo

Criar um arquivo `migration_full.sql` no projeto contendo toda a estrutura do banco de dados, respeitando rigorosamente a ordem de dependencias entre tabelas, funcoes e triggers para que possa ser executado de uma so vez sem erros.

## Ordem de Execucao (Topologia de Dependencias)

O arquivo sera dividido em 8 secoes, executadas nesta ordem:

### Secao 1: Enums (sem dependencias)

```text
1. detail_category (ooh, radio, tv, custom)
2. environment_permission_level (none, view, edit, admin)
3. environment_role (owner, admin, user)
4. environment_section (executive_dashboard, reports, finance, media_plans, media_resources, taxonomy, library)
5. plan_permission_level (none, view, edit)
6. system_role (system_admin, user)
```

### Secao 2: Funcoes Utilitarias (sem dependencia de tabelas)

Funcoes que sao usadas por triggers e policies e precisam existir antes das tabelas:

```text
1. generate_slug()
2. auto_generate_slug()
3. update_updated_at_column()
4. generate_creative_id()
5. set_creative_id()
6. build_utm_campaign_string()
7. generate_unique_plan_slug()
8. auto_generate_plan_slug()
9. auto_generate_line_utm()
10. validate_allocation_percentage()
11. update_line_detail_links_updated_at()
```

### Secao 3: Tabelas - Nivel 0 (sem FK para outras tabelas public)

```text
1. profiles (FK -> auth.users)
2. system_roles (sem FK public)
3. system_access_requests (FK -> auth.users)
4. environments (FK -> auth.users)
5. creative_types (sem FK)
6. file_extensions (sem FK)
7. menu_visibility_settings (FK -> auth.users)
```

### Secao 4: Tabelas - Nivel 1 (dependem apenas do Nivel 0)

```text
1. environment_members (-> environments implicitamente via owner_user_id)
2. environment_roles (-> environments)
3. invite_audit_log (-> environments)
4. pending_environment_invites (-> environments)
5. mediums (-> environments)
6. clients (-> environments)
7. statuses (-> environments)
8. moments (-> environments)
9. funnel_stages (-> environments)
10. formats (-> environments)
11. custom_kpis (-> environments)
12. data_sources (-> environments)
13. media_objectives (-> environments)
14. line_detail_types (-> environments)
15. financial_roles (sem FK public relevante)
16. financial_vendors (-> environments)
17. financial_alert_configs (-> environments)
18. financial_audit_log (-> environments)
19. finance_account_managers (-> environments)
20. finance_accounts (-> environments)
21. finance_campaign_projects (-> environments)
22. finance_cost_centers (-> environments)
23. finance_document_types (-> environments)
24. finance_macro_classifications (-> environments)
25. finance_packages (-> environments)
26. finance_request_types (-> environments)
27. finance_statuses (-> environments)
28. finance_teams (-> environments)
29. behavioral_segmentations (-> environments)
```

### Secao 5: Tabelas - Nivel 2 (dependem do Nivel 0 + 1)

```text
1. vehicles (-> mediums, environments)
2. targets (-> environments, clients)
3. status_transitions (-> statuses, environments)
4. finance_expense_classifications (-> finance_macro_classifications, environments)
5. format_creative_types (-> formats, environments)
6. media_plans (-> environments, auth.users, clients)
7. plan_subdivisions (-> environments, self-ref)
```

### Secao 6: Tabelas - Nivel 3 (dependem do Nivel 2)

```text
1. channels (-> vehicles, environments)
2. creative_templates (-> creative_types, environments)
3. creative_type_specifications (-> format_creative_types, environments)
4. plan_budget_distributions (-> media_plans, environments, self-ref)
5. plan_custom_kpis (-> media_plans, custom_kpis)
6. plan_permissions (-> media_plans, auth.users)
7. plan_status_history (-> media_plans)
8. media_plan_versions (-> media_plans)
9. media_plan_followers (-> media_plans)
10. media_plan_notification_state (-> media_plans)
11. financial_documents (-> media_plans, financial_vendors, environments)
12. financial_actuals (-> media_plans, environments)
13. financial_forecasts (-> media_plans, environments)
14. financial_revenues (-> media_plans, environments)
15. report_imports (-> environments, media_plans)
16. report_periods (-> media_plans, environments)
```

### Secao 7: Tabelas - Nivel 4 (dependem do Nivel 3)

```text
1. media_lines (-> media_plans, environments, moments, funnel_stages, mediums, vehicles, channels, targets, creative_templates, statuses, media_objectives, plan_subdivisions, auth.users)
2. specification_copy_fields (-> creative_type_specifications)
3. specification_dimensions (-> creative_type_specifications)
4. specification_extensions (-> creative_type_specifications, file_extensions)
5. financial_payments (-> financial_documents, environments)
6. report_column_mappings (-> report_imports)
7. report_metrics (-> data_sources, report_periods, media_lines, media_plans -- parcial)
```

### Secao 8: Tabelas - Nivel 5 (dependem do Nivel 4)

```text
1. media_line_monthly_budgets (-> media_lines, environments)
2. line_targets (-> media_lines, environments)
3. media_creatives (-> media_lines, formats, environments)
4. performance_alerts (-> media_plans, media_lines, environments)
5. report_data (-> media_plans, media_lines, report_imports)
6. line_details (-> media_plans, line_detail_types, media_lines, environments)
```

### Secao 9: Tabelas - Nivel 6 (dependem do Nivel 5)

```text
1. creative_change_logs (-> media_creatives)
2. line_detail_line_links (-> line_details, media_lines, environments)
3. line_detail_items (-> line_details, statuses, environments, formats, media_creatives)
```

### Secao 10: Tabelas - Nivel 7

```text
1. line_detail_insertions (-> line_detail_items, environments)
```

### Secao 11: Indices (apos todas as tabelas)

Todos os indices nao-PK serao criados aqui.

### Secao 12: RLS + Policies

Habilitar RLS em todas as 76 tabelas e criar todas as ~150+ policies.

### Secao 13: Funcoes que dependem de tabelas

Funcoes que referenciam tabelas existentes:

```text
1. is_system_admin()
2. is_environment_owner()
3. can_access_user_data()
4. can_access_user_data_for_write()
5. is_environment_member()
6. is_environment_admin()
7. is_environment_owner_of()
8. get_environment_role()
9. get_environment_permission()
10. has_environment_permission()
11. has_environment_access()
12. has_environment_section_access()
13. can_invite_to_environment()
14. can_invite_environment_member()
15. can_manage_member_role()
16. can_remove_environment_member()
17. count_environment_members()
18. enforce_environment_member_limit()
19. prevent_last_admin_removal()
20. get_user_environments()
21. get_user_environments_v2()
22. get_environment_members_with_details()
23. get_environment_members_admin()
24. list_all_environments()
25. expire_pending_invites()
26. get_plan_role()
27. can_transition_status()
28. get_effective_plan_permission()
29. can_edit_plan()
30. can_view_plan()
31. can_view_environment_roles()
32. has_finance_role()
33. handle_new_user()
34. process_pending_invites()
35. create_plan_version_snapshot()
36. create_auto_backup_snapshot()
37. cleanup_old_auto_backups()
38. auto_version_on_status_change()
39. trigger_auto_backup_on_plan_change()
40. trigger_auto_backup_on_line_change()
41. auto_log_creative_changes()
42. get_environment_id_for_user()
```

### Secao 14: Triggers

Todos os triggers nas tabelas public + os triggers em auth.users.

### Secao 15: Storage

Instrucoes para criar o bucket `environment-logos`.

### Secao 16: Realtime

Publicacoes realtime (se houver).

---

## Arquivo gerado

Sera criado o arquivo `migration_full.sql` na raiz do projeto com todo o DDL em ordem.

Tambem sera criado um arquivo `MIGRATION_README.md` com instrucoes de como executar:

1. Criar projeto Supabase
2. Executar o SQL no SQL Editor
3. Copiar Edge Functions
4. Configurar secrets
5. Atualizar variaveis de ambiente no frontend

## Detalhes tecnicos

- Todas as FK que referenciam `auth.users` serao mantidas pois essa tabela ja existe no Supabase
- Funcoes SECURITY DEFINER mantem `SET search_path TO 'public'`
- CHECK constraints sao preservados (nao ha validacoes temporais entre eles)
- Unique constraints e indices parciais sao todos incluidos
- O arquivo usara `CREATE TABLE IF NOT EXISTS` para seguranca
- FKs serao criadas inline nas tabelas ou via ALTER TABLE ao final quando necessario para resolver dependencias circulares (ex: `plan_subdivisions` tem self-reference e `plan_budget_distributions` tambem)

