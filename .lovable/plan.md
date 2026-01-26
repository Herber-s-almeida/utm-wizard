
## Plano: Corrigir Salvamento de Planos de Mídia e Melhorar Notificações de Erro

### Problema Identificado

Os logs do banco de dados mostram claramente o erro:
```
"new row violates row-level security policy for table "media_plans"
```

O wizard de criação de planos **não está incluindo o `environment_id`** obrigatório nas operações de inserção, causando rejeição pelas políticas de segurança (RLS) do banco de dados.

Além disso, o sistema exibe apenas "Erro ao salvar plano" sem explicar a causa específica.

---

### Correção 1: Incluir `environment_id` nas Inserções

**Arquivo:** `src/pages/NewMediaPlanBudget.tsx`

Importar o hook de ambiente e incluir o ID em todas as inserções:

```typescript
// Importar no topo do arquivo
import { useEnvironment } from '@/contexts/EnvironmentContext';

// Dentro do componente
const { currentEnvironmentId } = useEnvironment();
```

**Inserção de `media_plans` (linhas 329-349):**
Adicionar `environment_id: currentEnvironmentId` ao objeto de inserção.

**Inserção de `plan_budget_distributions` (linhas 365-375):**
Adicionar `environment_id: currentEnvironmentId` ao objeto de inserção.

---

### Correção 2: Validar Ambiente Antes de Salvar

Antes de iniciar o processo de salvamento, verificar se o ambiente está selecionado:

```typescript
if (!currentEnvironmentId) {
  toast.error('Ambiente não selecionado. Por favor, selecione um ambiente antes de salvar.');
  return;
}
```

---

### Correção 3: Melhorar Tratamento de Erros

Substituir o tratamento genérico de erros por mensagens específicas seguindo o padrão já usado no `MediaLineWizard`:

```typescript
} catch (error: any) {
  console.error('Error creating plan:', error);
  
  // Mensagens específicas por código de erro
  if (error?.code === '42501') {
    toast.error('Sem permissão para criar plano. Verifique suas permissões no ambiente atual.');
  } else if (error?.code === '23503') {
    toast.error('Referência inválida. Verifique se o cliente e outros campos selecionados existem.');
  } else if (error?.code === '23505') {
    toast.error('Já existe um plano com este nome neste ambiente.');
  } else if (error?.code === '23502') {
    toast.error('Campo obrigatório não preenchido. Verifique todos os campos do formulário.');
  } else {
    toast.error(error?.message || 'Erro ao salvar plano. Tente novamente.');
  }
}
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/NewMediaPlanBudget.tsx` | Importar `useEnvironment` |
| `src/pages/NewMediaPlanBudget.tsx` | Validar `currentEnvironmentId` antes de salvar |
| `src/pages/NewMediaPlanBudget.tsx` | Adicionar `environment_id` na inserção de `media_plans` |
| `src/pages/NewMediaPlanBudget.tsx` | Adicionar `environment_id` na inserção de `plan_budget_distributions` |
| `src/pages/NewMediaPlanBudget.tsx` | Melhorar tratamento de erros com códigos específicos |

---

### Resultado Esperado

1. **Planos serão salvos corretamente** - O `environment_id` será incluído em todas as inserções
2. **Mensagens de erro claras** - Usuário saberá exatamente qual problema ocorreu:
   - "Sem permissão para criar plano..."
   - "Já existe um plano com este nome..."
   - "Referência inválida..."
3. **Validação prévia** - Se ambiente não estiver selecionado, usuário será informado antes da tentativa de salvamento

---

### Seção Técnica

**Arquivos a modificar:**
- `src/pages/NewMediaPlanBudget.tsx`

**Linhas específicas:**
- Linha 1-10: Adicionar import do `useEnvironment`
- Linha 86-92: Extrair `currentEnvironmentId` do hook
- Linha 318-324: Adicionar validação de ambiente antes de salvar
- Linha 329-349: Adicionar `environment_id: currentEnvironmentId` na inserção de `media_plans`
- Linha 365-375: Adicionar `environment_id: currentEnvironmentId` na inserção de `plan_budget_distributions`
- Linha 429-434: Substituir tratamento genérico por mensagens específicas

**Códigos de erro do Supabase/PostgreSQL:**
- `42501`: Permission Denied (RLS violation)
- `23503`: Foreign Key Violation (referência inválida)
- `23505`: Unique Violation (duplicado)
- `23502`: Not Null Violation (campo obrigatório)
