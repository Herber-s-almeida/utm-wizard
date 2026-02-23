

# Alerta de Versao Nao Salva e Inclusao de Detalhamentos no Versionamento

## Resumo

Duas funcionalidades serao implementadas:

1. **Alerta de versao nao salva**: Um popup (lightbox) que aparece ao abrir o plano quando a ultima alteracao nao foi salva manualmente. O usuario pode fechar e continuar, mas o aviso reaparecera ate que salve manualmente.

2. **Inclusao dos detalhamentos de midia (line_details) nos snapshots de versao e backup**: Atualmente, os snapshots salvam `plan`, `lines`, `distributions` e `monthly_budgets`, mas nao incluem os `line_details` nem seus `line_detail_line_links`. Isso sera corrigido.

Alem disso, o numero da versao manual sera exibido no resumo do plano.

---

## Parte 1: Numero da Versao Manual no Resumo

### Alteracoes

**`src/pages/MediaPlanDetail.tsx`**
- Importar `usePlanVersions` e obter a lista de versoes
- Calcular o numero da ultima versao manual salva (filtrar `is_auto_backup = false`, pegar o maior `version_number`)
- Passar esse numero como prop para `PlanDetailSummaryCard`

**`src/components/media-plan/PlanDetailSummaryCard.tsx`**
- Adicionar prop `manualVersionNumber?: number`
- Exibir no header do card, ao lado do titulo "Resumo do Plano", um badge com "v{numero}" (ex: "v3")

---

## Parte 2: Alerta de Versao Nao Salva

### Logica de deteccao

Comparar timestamps:
- `lastManualVersionDate`: `created_at` da versao manual mais recente (`is_auto_backup = false`)
- `lastAutoBackupDate`: `created_at` do backup automatico mais recente (`is_auto_backup = true`)

Se `lastAutoBackupDate > lastManualVersionDate` (ou nao existir nenhuma versao manual), significa que houve alteracoes apos a ultima versao salva manualmente. Neste caso, exibir o alerta.

### Componente novo: `UnsavedVersionAlert`

**`src/components/media-plan/UnsavedVersionAlert.tsx`**

Um AlertDialog (lightbox) com:
- Titulo: "Versao nao salva"
- Descricao: "Este plano possui alteracoes que ainda nao foram salvas em uma versao manual. Salvar uma versao garante que voce possa restaurar este estado posteriormente."
- Botao primario: "Salvar Versao Agora" - abre o dialog de salvar versao (SaveVersionButton)
- Botao secundario: "Continuar sem Salvar" - fecha o alerta

O alerta aparece automaticamente ao carregar o plano (via `useEffect` com dependencia nos dados de versoes).

### Integracoes em `MediaPlanDetail.tsx`

- Importar o novo componente e `usePlanVersions`
- Calcular `hasUnsavedChanges` baseado na comparacao de timestamps
- Exibir `UnsavedVersionAlert` quando `hasUnsavedChanges = true` e o plano terminar de carregar
- Permitir ao usuario fechar sem salvar (estado local `dismissed`), mas o alerta reaparece na proxima vez que abrir o plano

---

## Parte 3: Incluir Detalhamentos de Midia nos Snapshots

### Problema atual

As funcoes de banco `create_plan_version_snapshot` e `create_auto_backup_snapshot` constroem o JSON snapshot com `plan`, `lines`, `distributions` e `monthly_budgets`, mas **nao incluem** `line_details` nem `line_detail_line_links`.

### Alteracoes no banco (migracao SQL)

Atualizar ambas as funcoes para incluir dois novos campos no snapshot:

```sql
-- Dentro do jsonb_build_object, adicionar:
'line_details', COALESCE((
  SELECT jsonb_agg(row_to_json(ld))
  FROM line_details ld
  WHERE ld.media_plan_id = _plan_id
), '[]'::jsonb),
'line_detail_links', COALESCE((
  SELECT jsonb_agg(row_to_json(ldl))
  FROM line_detail_line_links ldl
  JOIN line_details ld ON ld.id = ldl.line_detail_id
  WHERE ld.media_plan_id = _plan_id
), '[]'::jsonb)
```

Isso sera aplicado em:
- `create_plan_version_snapshot` (versao manual)
- `create_auto_backup_snapshot` (backup automatico)

### Alteracoes na restauracao (`usePlanVersions.ts`)

Na funcao `restoreVersionMutation`, apos recriar linhas e monthly_budgets, adicionar:

1. Deletar `line_detail_line_links` existentes (via cascade ou manual)
2. Deletar `line_details` existentes do plano
3. Recriar `line_details` a partir do snapshot
4. Recriar `line_detail_line_links` a partir do snapshot

### Atualizacao do tipo `PlanVersion`

Adicionar ao `snapshot_data`:
```typescript
line_details?: Record<string, unknown>[];
line_detail_links?: Record<string, unknown>[];
```

---

## Arquivos modificados

| Arquivo | Tipo | Descricao |
|---|---|---|
| `src/components/media-plan/UnsavedVersionAlert.tsx` | Novo | Componente do popup de alerta |
| `src/components/media-plan/PlanDetailSummaryCard.tsx` | Editar | Adicionar badge de versao manual |
| `src/pages/MediaPlanDetail.tsx` | Editar | Integrar alerta, versao manual e props |
| `src/hooks/usePlanVersions.ts` | Editar | Tipo do snapshot + restauracao de line_details |
| Migracao SQL | Novo | Atualizar funcoes de snapshot no banco |

---

## Fluxo do usuario

```text
Usuario abre plano
       |
       v
Sistema carrega versoes
       |
       v
Ultima alteracao foi salva manualmente?
       |               |
      SIM             NAO
       |               |
       v               v
  Nada acontece   Popup aparece
                       |
           +-----------+-----------+
           |                       |
    "Salvar Versao"       "Continuar sem Salvar"
           |                       |
           v                       v
    Dialog de salvar         Fecha popup
    versao abre              (reaparece ao
    (com descricao)          reabrir o plano)
```

