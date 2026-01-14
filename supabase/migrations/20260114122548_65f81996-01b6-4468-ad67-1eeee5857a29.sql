-- Add hierarchy_config column to media_plans for granular budget allocation control per level
ALTER TABLE media_plans 
ADD COLUMN hierarchy_config jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN media_plans.hierarchy_config IS 
'Configuração por nível hierárquico: [{level: "subdivision", allocate_budget: true}, {level: "moment", allocate_budget: false}, ...]';

-- Create index for better query performance on jsonb column
CREATE INDEX idx_media_plans_hierarchy_config ON media_plans USING gin (hierarchy_config);