-- Seed default system statuses (global, non-editable)
-- Using a fixed UUID so no real user can update/delete them under RLS policies.

insert into public.statuses (name, description, is_system, user_id)
select 'Ativo', null, true, '00000000-0000-0000-0000-000000000000'::uuid
where not exists (
  select 1 from public.statuses where is_system = true and name = 'Ativo'
);

insert into public.statuses (name, description, is_system, user_id)
select 'Finalizado', null, true, '00000000-0000-0000-0000-000000000000'::uuid
where not exists (
  select 1 from public.statuses where is_system = true and name = 'Finalizado'
);

insert into public.statuses (name, description, is_system, user_id)
select 'Pendente', null, true, '00000000-0000-0000-0000-000000000000'::uuid
where not exists (
  select 1 from public.statuses where is_system = true and name = 'Pendente'
);
