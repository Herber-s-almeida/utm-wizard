-- =====================================================
-- SOFT DELETE MIGRATION FOR ALL LIBRARY TABLES
-- =====================================================

-- 1. plan_subdivisions
ALTER TABLE public.plan_subdivisions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_active 
ON public.plan_subdivisions (user_id) 
WHERE deleted_at IS NULL;

-- 2. moments
ALTER TABLE public.moments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_moments_active 
ON public.moments (user_id) 
WHERE deleted_at IS NULL;

-- 3. funnel_stages
ALTER TABLE public.funnel_stages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_funnel_stages_active 
ON public.funnel_stages (user_id) 
WHERE deleted_at IS NULL;

-- 4. mediums
ALTER TABLE public.mediums 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_mediums_active 
ON public.mediums (user_id) 
WHERE deleted_at IS NULL;

-- 5. vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_vehicles_active 
ON public.vehicles (user_id) 
WHERE deleted_at IS NULL;

-- 6. channels
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_channels_active 
ON public.channels (user_id) 
WHERE deleted_at IS NULL;

-- 7. targets
ALTER TABLE public.targets 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_targets_active 
ON public.targets (user_id) 
WHERE deleted_at IS NULL;

-- 8. formats
ALTER TABLE public.formats 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_formats_active 
ON public.formats (user_id) 
WHERE deleted_at IS NULL;

-- 9. format_creative_types
ALTER TABLE public.format_creative_types 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_format_creative_types_active 
ON public.format_creative_types (user_id) 
WHERE deleted_at IS NULL;

-- 10. creative_type_specifications
ALTER TABLE public.creative_type_specifications 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_creative_type_specifications_active 
ON public.creative_type_specifications (user_id) 
WHERE deleted_at IS NULL;

-- 11. specification_copy_fields
ALTER TABLE public.specification_copy_fields 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_specification_copy_fields_active 
ON public.specification_copy_fields (user_id) 
WHERE deleted_at IS NULL;

-- 12. specification_dimensions
ALTER TABLE public.specification_dimensions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_specification_dimensions_active 
ON public.specification_dimensions (user_id) 
WHERE deleted_at IS NULL;

-- 13. statuses
ALTER TABLE public.statuses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_statuses_active 
ON public.statuses (user_id) 
WHERE deleted_at IS NULL;

-- 14. behavioral_segmentations
ALTER TABLE public.behavioral_segmentations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_behavioral_segmentations_active 
ON public.behavioral_segmentations (user_id) 
WHERE deleted_at IS NULL;

-- 15. creative_templates
ALTER TABLE public.creative_templates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_creative_templates_active 
ON public.creative_templates (user_id) 
WHERE deleted_at IS NULL;