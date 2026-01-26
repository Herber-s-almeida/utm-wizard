
## Plano: Aumentar Precisão de Porcentagem para Valores Monetários Exatos

### Problema

Ao inserir R$ 118.000,00 em um orçamento total de R$ 249.400,00:
- **Porcentagem exata**: 47,31355253...%  
- **Arredondamento atual**: 47,31% (2 casas decimais)
- **Valor recalculado**: R$ 117.991,14 (diferença de R$ 8,86)

O sistema usa porcentagem com apenas 2 casas decimais como "fonte da verdade", causando distorções quando o usuário edita valores absolutos.

### Solução Proposta

Aumentar a precisão interna para **4 casas decimais** na porcentagem, mantendo a **exibição com 2 casas** para o usuário.

---

### Alterações

#### 1. `BudgetAllocationTable.tsx` - Aumentar precisão do cálculo

**Mudança na linha 120:**
```typescript
// ANTES (2 casas decimais)
onUpdate(id, Math.round(percentage * 100) / 100);

// DEPOIS (4 casas decimais)
onUpdate(id, Math.round(percentage * 10000) / 10000);
```

**Mudança na exibição (linha 266):**
```typescript
// Continuar mostrando apenas 2 casas para o usuário
{item.percentage.toFixed(2)}%
```

#### 2. `PercentageInput.tsx` - Aumentar precisão do parsing

**Mudança na linha 26:**
```typescript
// ANTES
return isNaN(result) ? 0 : Math.round(result * 100) / 100;

// DEPOIS  
return isNaN(result) ? 0 : Math.round(result * 10000) / 10000;
```

#### 3. `BudgetAllocationTable.tsx` - Ajustar tolerância de validação

**Mudança na linha 67:**
```typescript
// ANTES (tolerância muito pequena)
const isValid = Math.abs(totalPercentage - 100) < 0.01;

// DEPOIS (tolerância para 4 casas decimais)
const isValid = Math.abs(totalPercentage - 100) < 0.0001;
```

#### 4. `BudgetAllocationTable.tsx` - Exibição do total

**Linha 305 - continuar mostrando 2 casas:**
```typescript
{totalPercentage.toFixed(2)}%
```

---

### Resultado Esperado

| Entrada | Antes | Depois |
|---------|-------|--------|
| R$ 118.000 de R$ 249.400 | 47,31% → R$ 117.991,14 | 47,3136% → R$ 118.000,00 |

O usuário conseguirá inserir valores monetários exatos, e a porcentagem será ajustada automaticamente com precisão suficiente.

---

### Seção Técnica

**Arquivos a modificar:**
1. `src/components/media-plan/BudgetAllocationTable.tsx`
   - Linha 67: tolerância de validação
   - Linha 120: precisão do cálculo de porcentagem
   
2. `src/components/media-plan/PercentageInput.tsx`
   - Linha 26: precisão do parsing

**Impacto:**
- Porcentagens serão armazenadas com até 4 casas decimais internamente
- Interface continua exibindo 2 casas decimais para leitura limpa
- Retrocompatível com dados existentes (porcentagens com menos casas continuam funcionando)
