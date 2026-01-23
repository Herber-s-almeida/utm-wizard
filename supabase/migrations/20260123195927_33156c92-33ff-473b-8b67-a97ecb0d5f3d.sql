-- Clean up field_schema of system detail types to remove redundant fields
-- These fields should be inherited from the media line, not entered again

-- TV Aberta: Remove 'emissora' (is vehicle), 'formato' (from library), 'segundagem' (from format)
UPDATE line_detail_types
SET field_schema = '[
  {"key": "programa", "label": "Programa", "required": true, "type": "text", "width": 200},
  {"key": "horario", "label": "Hora Inicial", "type": "time", "width": 80},
  {"key": "peca", "label": "Peça", "type": "text", "width": 80},
  {"key": "preco_tabela", "label": "Preço Tabela", "required": true, "type": "currency", "width": 120},
  {"key": "percentual_negociacao", "label": "% Neg.", "type": "percentage", "width": 70},
  {"key": "preco_negociado", "label": "Preço Neg.", "type": "currency", "width": 120},
  {"key": "custo_liquido", "label": "Custo Líquido", "type": "currency", "width": 120},
  {"key": "audiencia_ia", "label": "Aud. IA", "type": "number", "width": 70},
  {"key": "audiencia_grp", "label": "GRP", "type": "number", "width": 70},
  {"key": "audiencia_trp", "label": "TRP", "type": "number", "width": 70},
  {"key": "cpp", "label": "C.P.P.", "type": "number", "width": 80},
  {"key": "custo_grp", "label": "Custo GRP", "type": "currency", "width": 100}
]'::jsonb,
-- Remove 'praca' from metadata_schema - it's inherited
metadata_schema = '[
  {"key": "banco_audiencia", "label": "Banco de Audiência", "type": "text"},
  {"key": "universo_potencial", "label": "Universo Potencial", "type": "number"},
  {"key": "target", "label": "Target", "type": "text"}
]'::jsonb,
updated_at = now()
WHERE name = 'TV Aberta' AND is_system = true;

-- Rádio: Remove 'veiculo', 'duracao' (from format)
UPDATE line_detail_types
SET field_schema = '[
  {"key": "projeto", "label": "Projeto", "type": "text", "width": 120},
  {"key": "item", "label": "Item", "type": "text", "width": 150},
  {"key": "key_message", "label": "Key Message", "type": "text", "width": 100},
  {"key": "obs", "label": "OBS", "type": "text", "width": 100},
  {"key": "data_inicio", "label": "Início", "type": "date", "width": 100},
  {"key": "data_fim", "label": "Fim", "type": "date", "width": 100},
  {"key": "preco_unitario_tabela", "label": "$ Unit. Tabela", "type": "currency", "width": 110},
  {"key": "percentual_negociacao", "label": "% Neg.", "type": "percentage", "width": 70},
  {"key": "preco_unitario_negociado", "label": "Unit. Negociado", "type": "currency", "width": 120},
  {"key": "total_negociado", "label": "TT Negociado", "type": "currency", "width": 120},
  {"key": "total_liquido", "label": "TT Líquido", "type": "currency", "width": 120}
]'::jsonb,
-- Remove 'praca' from metadata_schema - it's inherited
metadata_schema = '[]'::jsonb,
updated_at = now()
WHERE name = 'Rádio' AND is_system = true;

-- OOH: Remove 'praca', 'meio', 'formato' - inherited from line
UPDATE line_detail_types
SET field_schema = '[
  {"key": "status", "label": "Status", "options": ["Reservado", "Ativo", "Programado", "Cancelado"], "type": "select", "width": 90},
  {"key": "uf", "label": "UF", "type": "text", "width": 50},
  {"key": "representante", "label": "Representante", "type": "text", "width": 120},
  {"key": "mensagem", "label": "Mensagem", "type": "text", "width": 120},
  {"key": "descricao", "label": "Descrição/Endereço", "type": "text", "width": 250},
  {"key": "ambiente", "label": "Ambiente", "options": ["Via Pública", "Shopping", "Aeroporto", "Metrô", "Rodoviária"], "type": "select", "width": 100},
  {"key": "tipo", "label": "Tipo", "options": ["Digital", "Estático"], "type": "select", "width": 80},
  {"key": "tipo_periodo", "label": "Período", "options": ["Mensal", "Semanal", "Bissemanal", "Quinzenal", "Diário"], "type": "select", "width": 90},
  {"key": "quantidade", "label": "Qtd", "type": "number", "width": 50},
  {"key": "valor_unitario_tabela", "label": "Valor Unit. Tabela", "type": "currency", "width": 130},
  {"key": "percentual_negociacao", "label": "%", "type": "percentage", "width": 60},
  {"key": "valor_unitario_negociado", "label": "Unit. Bruto Neg.", "type": "currency", "width": 130},
  {"key": "valor_unitario_liquido", "label": "Unit. Líq. Neg.", "type": "currency", "width": 130},
  {"key": "total_bruto_negociado", "label": "Total Bruto Neg.", "type": "currency", "width": 130},
  {"key": "total_liquido_negociado", "label": "Total Líq. Neg.", "type": "currency", "width": 130},
  {"key": "producao_unitaria", "label": "Prod. Unit.", "type": "currency", "width": 100},
  {"key": "producao_total", "label": "Prod. Total", "type": "currency", "width": 100},
  {"key": "data_inicio", "label": "Início", "type": "date", "width": 100},
  {"key": "data_fim", "label": "Fim", "type": "date", "width": 100},
  {"key": "observacao", "label": "Observação", "type": "text", "width": 200}
]'::jsonb,
updated_at = now()
WHERE name = 'OOH / Mídia Exterior';

-- Add a comment to document which fields are inherited
COMMENT ON TABLE line_detail_types IS 'Types of detail schemas for media lines. Note: Fields for Vehicle, Medium, Channel, Subdivision, Moment, and Format should NOT be included in field_schema as they are automatically inherited from the parent media line.';