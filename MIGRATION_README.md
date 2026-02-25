# Guia de Migração: Lovable Cloud → Supabase

## Pré-requisitos

- Uma conta no [Supabase](https://supabase.com)
- Acesso ao código-fonte do projeto

## Passo 1: Criar projeto Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **New Project**
3. Escolha a região mais próxima dos seus usuários
4. Anote a **URL** e a **anon key** do projeto

## Passo 2: Executar a migração SQL

1. Abra o **SQL Editor** no dashboard do Supabase
2. Cole o conteúdo inteiro do arquivo `migration_full.sql`
3. Execute o script
4. Verifique se não houve erros (deve completar sem problemas graças à ordem de dependências)

> **Nota:** O script usa `CREATE TABLE IF NOT EXISTS` e `DO $$ BEGIN ... EXCEPTION ... END $$` para enums, então é seguro re-executar parcialmente se necessário.

## Passo 3: Configurar Edge Functions

Copie a pasta `supabase/functions/` para o seu projeto Supabase local:

```bash
# Na raiz do projeto
supabase functions deploy admin-operations
supabase functions deploy import-report-data
supabase functions deploy invite-environment-member
supabase functions deploy invite-to-plan
supabase functions deploy seed-test-plans
supabase functions deploy send-invite-email
supabase functions deploy send-resource-notification
```

### Configuração de JWT (`supabase/config.toml`)

```toml
[functions.invite-to-plan]
verify_jwt = true

[functions.import-report-data]
verify_jwt = false

[functions.seed-test-plans]
verify_jwt = false

[functions.admin-operations]
verify_jwt = false

[functions.invite-environment-member]
verify_jwt = false

[functions.send-resource-notification]
verify_jwt = false

[functions.send-invite-email]
verify_jwt = false
```

## Passo 4: Configurar Secrets

No dashboard do Supabase, vá em **Settings → Edge Functions → Secrets** e adicione:

| Secret | Descrição |
|--------|-----------|
| `RESEND_API_KEY` | Chave da API do Resend para envio de emails |

> `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão.

## Passo 5: Atualizar o Frontend

Atualize o arquivo `.env` (ou variáveis de ambiente) do frontend:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-anon-key-aqui
```

E atualize o client em `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Passo 6: Migração de Dados (Opcional)

Este script migra apenas a **estrutura** (DDL). Para migrar dados existentes:

### Opção A: pg_dump (recomendado)

```bash
# Exportar dados do Cloud
pg_dump --data-only --no-owner --no-privileges \
  -h HOST_ANTIGO -U postgres -d postgres > data_dump.sql

# Importar no novo Supabase
psql -h HOST_NOVO -U postgres -d postgres < data_dump.sql
```

### Opção B: CSV via Dashboard

1. No dashboard antigo, exporte cada tabela como CSV
2. No novo dashboard, importe os CSVs na mesma ordem de dependência

## Estrutura do Script

O arquivo `migration_full.sql` segue esta ordem rigorosa:

| Seção | Conteúdo |
|-------|----------|
| 1 | Enums (6 tipos) |
| 2 | Funções utilitárias (sem dependência de tabelas) |
| 3 | Tabelas Nível 0 (sem FK para public) |
| 4 | Tabelas Nível 1 (dependem do Nível 0) |
| 5 | Tabelas Nível 2 |
| 6 | Tabelas Nível 3 |
| 7 | Tabelas Nível 4 |
| 8 | Tabelas Nível 5 |
| 9 | Tabelas Nível 6 |
| 10 | Tabelas Nível 7 |
| 11 | Índices |
| 12 | RLS (Row Level Security) em todas as tabelas |
| 13 | Funções que dependem de tabelas |
| 14 | RLS Policies (~150+) |
| 15 | Triggers nas tabelas public |
| 16 | Triggers em auth.users |
| 17 | Storage bucket + policies |

## Troubleshooting

### Erro: "relation already exists"
O script usa `IF NOT EXISTS` — pode ser re-executado com segurança.

### Erro: "function does not exist"
Verifique se as seções 2 e 13 foram executadas corretamente (funções utilitárias e dependentes).

### Erro: "policy already exists"
Remova as policies existentes antes de re-executar, ou execute apenas as seções necessárias.

### Triggers em auth.users falham
Se os triggers `on_auth_user_created` e `on_user_process_pending_invites` já existem, remova-os antes:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_process_pending_invites ON auth.users;
```

## Totais

- **76 tabelas**
- **6 enums**
- **40+ funções**
- **50+ triggers**
- **150+ RLS policies**
- **7 edge functions**
- **1 storage bucket**
