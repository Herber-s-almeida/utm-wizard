## Objetivo

Permitir ao usuário silenciar o diálogo "Versão não salva" até o próximo dia, persistindo a escolha por plano com timestamp.

## Mudanças

### 1. `src/components/media-plan/UnsavedVersionAlert.tsx`
- Adicionar `Checkbox` (shadcn) com label **"Não exibir mais hoje"** dentro do `AlertDialog`, abaixo da descrição.
- Novo estado local `dontShowAgain`.
- Receber novo prop opcional `onDontShowAgain?: (timestamp: string) => void`.
- Quando o usuário clicar em **"Continuar sem Salvar"** (ou fechar o diálogo) com o checkbox marcado, chamar `onDontShowAgain(new Date().toISOString())` antes de `onDismiss()`.
- Se clicar em **"Salvar Versão Agora"**, ignorar o checkbox (não precisa silenciar pois a versão será salva).

### 2. `src/pages/MediaPlanDetail.tsx`
- Criar helpers em torno de `localStorage` com chave `unsaved-version-alert-dismissed:<planId>` armazenando ISO timestamp.
- Função `isDismissedToday(planId)` que retorna `true` se o timestamp salvo for do mesmo dia local (`toDateString()` igual ao de `new Date()`). No próximo dia o alerta volta a aparecer automaticamente.
- Inicializar `unsavedAlertDismissed` com `isDismissedToday(planId)` (via `useState(() => …)`) e revalidar em `useEffect` quando `planId` muda.
- Passar callback `onDontShowAgain={(ts) => { localStorage.setItem(key, ts); setUnsavedAlertDismissed(true); }}` ao `UnsavedVersionAlert`.
- Manter o comportamento atual de `onDismiss` (esconde só na sessão se o checkbox não estiver marcado).

### Comportamento resultante
- Marcou "Não exibir mais hoje" + Continuar sem Salvar → diálogo só reaparece no próximo dia (ou se o plano voltar a estado salvo e depois ficar unsaved novamente após meia-noite).
- Não marcou → comportamento atual (some até refresh / próxima entrada na página).
- Por plano: a preferência é independente entre planos diferentes.

### Notas técnicas
- Sem alterações no backend nem em schema; persistência local apenas (preferência de UI por dispositivo/navegador).
- Sem alterações em outros consumidores; o novo prop é opcional.
