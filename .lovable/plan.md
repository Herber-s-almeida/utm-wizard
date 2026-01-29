
# Plano de Correção: Wizard de Formatos e Especificações

## Problemas Identificados

### 1. Dimensões Não Estão Sendo Salvas
**Causa raiz**: O loop que salva dimensões no `FormatWizardDialog.tsx` não trata erros de inserção individual. Se uma dimensão falha, as demais podem não ser salvas e o erro é silenciado.

**Evidência**: Consulta no banco retornou 0 registros em `specification_dimensions` para especificações recentes, enquanto `creative_type_specifications` tem os registros.

### 2. Duplicatas Sendo Criadas
**Causa raiz**: O botão "Concluir" no wizard pode ser clicado múltiplas vezes antes da primeira requisição terminar. Foram criados 7 formatos idênticos em milissegundos.

**Evidência**: Múltiplos registros com nome "Criar novo Formato para Anúncios Teste" criados entre 16:31:47 e 16:31:51.

---

## Correções Propostas

### Correção 1: Prevenir Duplo Clique no Wizard

Adicionar estado de `isSaving` para desabilitar o botão durante o salvamento:

```text
┌─────────────────────────────────────────┐
│ FormatWizardDialog                      │
├─────────────────────────────────────────┤
│ + isSaving: boolean (estado)            │
│                                         │
│ handleFinish():                         │
│   ├─ Verificar se já está salvando      │
│   ├─ Setar isSaving = true              │
│   ├─ [operações de banco]               │
│   └─ Setar isSaving = false no finally  │
│                                         │
│ Botão "Concluir":                       │
│   disabled={isSaving}                   │
│   {isSaving ? "Salvando..." : "Concluir"}│
└─────────────────────────────────────────┘
```

### Correção 2: Adicionar Tratamento de Erro nas Inserções

Modificar o loop de inserção de dimensões para capturar e reportar erros:

**Antes:**
```typescript
for (const dim of dimensions) {
  await supabase.from('specification_dimensions').insert({...});
}
```

**Depois:**
```typescript
for (const dim of dimensions) {
  const { error: dimError } = await supabase.from('specification_dimensions').insert({...});
  if (dimError) {
    console.error('Erro ao salvar dimensão:', dimError);
    throw dimError;
  }
}
```

O mesmo tratamento será aplicado para:
- `specification_copy_fields`
- `specification_extensions`

### Correção 3: Adicionar Logs de Debug para Diagnóstico

Adicionar console.log antes e depois de cada operação de salvamento para facilitar diagnóstico de problemas futuros:

```typescript
console.log('Salvando dimensões:', dimensions);
// ... insert
console.log('Dimensões salvas com sucesso');
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/config/FormatWizardDialog.tsx` | Adicionar estado `isSaving`, tratar erros em cada inserção, logs de debug |

---

## Detalhes Técnicos

### FormatWizardDialog.tsx - handleFinish()

```typescript
// Adicionar estado no início do componente
const [isSaving, setIsSaving] = useState(false);

// Modificar handleFinish
const handleFinish = async () => {
  if (isSaving) return; // Prevenir duplo clique
  
  setIsSaving(true);
  try {
    // ... código existente ...
    
    // 4. Create copy fields COM tratamento de erro
    for (const copy of copyFields) {
      const { error: copyError } = await supabase.from('specification_copy_fields').insert({
        specification_id: spec.id,
        name: copy.name,
        max_characters: copy.maxCharacters,
        observation: copy.observation || null,
        user_id: userId,
        environment_id: currentEnvironmentId,
      });
      if (copyError) throw copyError;
    }
    
    // 5. Create dimensions COM tratamento de erro
    for (const dim of dimensions) {
      const { error: dimError } = await supabase.from('specification_dimensions').insert({
        specification_id: spec.id,
        width: dim.width,
        height: dim.height,
        unit: dim.unit,
        description: dim.description,
        observation: dim.observation || null,
        user_id: userId,
        environment_id: currentEnvironmentId,
      });
      if (dimError) throw dimError;
    }
    
    // 6. Create extensions COM tratamento de erro
    for (const extId of selectedExtensions) {
      const { error: extError } = await supabase.from('specification_extensions').insert({
        specification_id: spec.id,
        extension_id: extId,
        user_id: userId,
        environment_id: currentEnvironmentId,
      });
      if (extError) throw extError;
    }
    
    // ... sucesso ...
  } catch (err) {
    console.error('Erro ao criar formato:', err);
    toast.error('Erro ao criar formato. Verifique os dados e tente novamente.');
  } finally {
    setIsSaving(false);
  }
};
```

### Botão no DialogFooter (linha ~600)

```typescript
<Button 
  onClick={handleFinish} 
  disabled={isSaving}
>
  {isSaving ? 'Salvando...' : 'Concluir'}
</Button>
```

---

## Resumo das Mudanças

1. **Prevenção de duplicatas**: Estado `isSaving` + verificação no início de `handleFinish`
2. **Tratamento de erros**: Cada inserção agora verifica e propaga erros
3. **Feedback visual**: Botão mostra "Salvando..." enquanto processa
4. **Bloco finally**: Garante que `isSaving` volte a `false` mesmo em caso de erro
