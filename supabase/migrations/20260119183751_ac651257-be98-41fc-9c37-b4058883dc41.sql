
-- ============================================
-- MIGRATION: Update RLS policies to use environment_id
-- ============================================

-- Helper function to check environment access with section-specific permissions
CREATE OR REPLACE FUNCTION public.has_environment_section_access(
  _environment_id UUID,
  _section TEXT,
  _required_level TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _perm_level TEXT;
BEGIN
  IF _environment_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_system_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get the permission level for the section
  SELECT 
    CASE _section
      WHEN 'library' THEN perm_library::TEXT
      WHEN 'media_plans' THEN perm_media_plans::TEXT
      WHEN 'media_resources' THEN perm_media_resources::TEXT
      WHEN 'taxonomy' THEN perm_taxonomy::TEXT
      WHEN 'finance' THEN perm_finance::TEXT
      WHEN 'reports' THEN perm_reports::TEXT
      WHEN 'executive_dashboard' THEN perm_executive_dashboard::TEXT
      ELSE 'none'
    END INTO _perm_level
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id
    AND er.user_id = _user_id
    AND er.accepted_at IS NOT NULL;
  
  IF _perm_level IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permission level
  IF _required_level = 'view' THEN
    RETURN _perm_level IN ('view', 'edit', 'admin');
  ELSIF _required_level = 'edit' THEN
    RETURN _perm_level IN ('edit', 'admin');
  ELSIF _required_level = 'admin' THEN
    RETURN _perm_level = 'admin';
  END IF;
  
  RETURN false;
END;
$$;

-- Drop old policies and create new ones for clients
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Environment read access for clients"
ON public.clients FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for clients"
ON public.clients FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for clients"
ON public.clients FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for clients"
ON public.clients FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- vehicles
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view accessible vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;

CREATE POLICY "Environment read access for vehicles"
ON public.vehicles FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for vehicles"
ON public.vehicles FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for vehicles"
ON public.vehicles FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- channels
DROP POLICY IF EXISTS "Users can view their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.channels;
DROP POLICY IF EXISTS "Users can insert their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.channels;
DROP POLICY IF EXISTS "Users can update their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can delete their own channels" ON public.channels;

CREATE POLICY "Environment read access for channels"
ON public.channels FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for channels"
ON public.channels FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for channels"
ON public.channels FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for channels"
ON public.channels FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- mediums
DROP POLICY IF EXISTS "Users can view their own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can view accessible mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can insert their own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.mediums;
DROP POLICY IF EXISTS "Users can update their own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can delete their own mediums" ON public.mediums;

CREATE POLICY "Environment read access for mediums"
ON public.mediums FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for mediums"
ON public.mediums FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for mediums"
ON public.mediums FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for mediums"
ON public.mediums FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- formats
DROP POLICY IF EXISTS "Users can view their own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can view accessible formats" ON public.formats;
DROP POLICY IF EXISTS "Users can insert their own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.formats;
DROP POLICY IF EXISTS "Users can update their own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can delete their own formats" ON public.formats;

CREATE POLICY "Environment read access for formats"
ON public.formats FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for formats"
ON public.formats FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for formats"
ON public.formats FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for formats"
ON public.formats FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- format_creative_types
DROP POLICY IF EXISTS "Users can view their own format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can view accessible format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can insert their own format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can update their own format_creative_types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can delete their own format_creative_types" ON public.format_creative_types;

CREATE POLICY "Environment read access for format_creative_types"
ON public.format_creative_types FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for format_creative_types"
ON public.format_creative_types FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for format_creative_types"
ON public.format_creative_types FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for format_creative_types"
ON public.format_creative_types FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- creative_type_specifications
DROP POLICY IF EXISTS "Users can view their own specifications" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can view accessible creative_type_specifications" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can insert their own specifications" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can update their own specifications" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can delete their own specifications" ON public.creative_type_specifications;

CREATE POLICY "Environment read access for creative_type_specifications"
ON public.creative_type_specifications FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for creative_type_specifications"
ON public.creative_type_specifications FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for creative_type_specifications"
ON public.creative_type_specifications FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for creative_type_specifications"
ON public.creative_type_specifications FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- funnel_stages
DROP POLICY IF EXISTS "Users can view their own funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can view accessible funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can insert their own funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can update their own funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can delete their own funnel stages" ON public.funnel_stages;

CREATE POLICY "Environment read access for funnel_stages"
ON public.funnel_stages FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for funnel_stages"
ON public.funnel_stages FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for funnel_stages"
ON public.funnel_stages FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for funnel_stages"
ON public.funnel_stages FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- media_objectives
DROP POLICY IF EXISTS "Users can view their own objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can view accessible media_objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can insert their own objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can update their own objectives" ON public.media_objectives;
DROP POLICY IF EXISTS "Users can delete their own objectives" ON public.media_objectives;

CREATE POLICY "Environment read access for media_objectives"
ON public.media_objectives FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for media_objectives"
ON public.media_objectives FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for media_objectives"
ON public.media_objectives FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for media_objectives"
ON public.media_objectives FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- targets
DROP POLICY IF EXISTS "Users can view their own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can view accessible targets" ON public.targets;
DROP POLICY IF EXISTS "Users can insert their own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.targets;
DROP POLICY IF EXISTS "Users can update their own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can delete their own targets" ON public.targets;

CREATE POLICY "Environment read access for targets"
ON public.targets FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for targets"
ON public.targets FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for targets"
ON public.targets FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for targets"
ON public.targets FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- moments
DROP POLICY IF EXISTS "Users can view their own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can view accessible moments" ON public.moments;
DROP POLICY IF EXISTS "Users can insert their own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.moments;
DROP POLICY IF EXISTS "Users can update their own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can delete their own moments" ON public.moments;

CREATE POLICY "Environment read access for moments"
ON public.moments FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for moments"
ON public.moments FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for moments"
ON public.moments FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for moments"
ON public.moments FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- statuses
DROP POLICY IF EXISTS "Users can view their own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can view accessible statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert their own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.statuses;
DROP POLICY IF EXISTS "Users can update their own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can delete their own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Everyone can view system statuses" ON public.statuses;

CREATE POLICY "Environment read access for statuses"
ON public.statuses FOR SELECT
USING (
  environment_id IS NULL OR -- System statuses
  public.has_environment_section_access(environment_id, 'library', 'view')
);

CREATE POLICY "Environment insert access for statuses"
ON public.statuses FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for statuses"
ON public.statuses FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for statuses"
ON public.statuses FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- media_plans
DROP POLICY IF EXISTS "Users can view their own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can view accessible media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can insert their own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.media_plans;
DROP POLICY IF EXISTS "Users can update their own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can delete their own media plans" ON public.media_plans;

CREATE POLICY "Environment read access for media_plans"
ON public.media_plans FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for media_plans"
ON public.media_plans FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for media_plans"
ON public.media_plans FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for media_plans"
ON public.media_plans FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- media_lines
DROP POLICY IF EXISTS "Users can view their own media lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can view accessible media lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can insert their own media lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.media_lines;
DROP POLICY IF EXISTS "Users can update their own media lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can delete their own media lines" ON public.media_lines;

CREATE POLICY "Environment read access for media_lines"
ON public.media_lines FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for media_lines"
ON public.media_lines FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for media_lines"
ON public.media_lines FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for media_lines"
ON public.media_lines FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- media_creatives
DROP POLICY IF EXISTS "Users can view their own creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can view accessible media_creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can insert their own creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can update their own creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can delete their own creatives" ON public.media_creatives;

CREATE POLICY "Environment read access for media_creatives"
ON public.media_creatives FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_resources', 'view'));

CREATE POLICY "Environment insert access for media_creatives"
ON public.media_creatives FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_resources', 'edit'));

CREATE POLICY "Environment update access for media_creatives"
ON public.media_creatives FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_resources', 'edit'));

CREATE POLICY "Environment delete access for media_creatives"
ON public.media_creatives FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_resources', 'admin'));

-- line_details
DROP POLICY IF EXISTS "Users can view their own line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can view accessible line_details" ON public.line_details;
DROP POLICY IF EXISTS "Users can insert their own line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.line_details;
DROP POLICY IF EXISTS "Users can update their own line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can delete their own line details" ON public.line_details;

CREATE POLICY "Environment read access for line_details"
ON public.line_details FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for line_details"
ON public.line_details FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for line_details"
ON public.line_details FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for line_details"
ON public.line_details FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- line_detail_items
DROP POLICY IF EXISTS "Users can view their own detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can view accessible line_detail_items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can insert their own detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can update their own detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can delete their own detail items" ON public.line_detail_items;

CREATE POLICY "Environment read access for line_detail_items"
ON public.line_detail_items FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for line_detail_items"
ON public.line_detail_items FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for line_detail_items"
ON public.line_detail_items FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for line_detail_items"
ON public.line_detail_items FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- line_detail_insertions
DROP POLICY IF EXISTS "Users can view their own insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can view accessible line_detail_insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can insert their own insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can update their own insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can delete their own insertions" ON public.line_detail_insertions;

CREATE POLICY "Environment read access for line_detail_insertions"
ON public.line_detail_insertions FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for line_detail_insertions"
ON public.line_detail_insertions FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for line_detail_insertions"
ON public.line_detail_insertions FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for line_detail_insertions"
ON public.line_detail_insertions FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- line_targets
DROP POLICY IF EXISTS "Users can view their own line targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can view accessible line_targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can insert their own line targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.line_targets;
DROP POLICY IF EXISTS "Users can update their own line targets" ON public.line_targets;
DROP POLICY IF EXISTS "Users can delete their own line targets" ON public.line_targets;

CREATE POLICY "Environment read access for line_targets"
ON public.line_targets FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for line_targets"
ON public.line_targets FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for line_targets"
ON public.line_targets FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for line_targets"
ON public.line_targets FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- line_detail_types
DROP POLICY IF EXISTS "Users can view their own detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can view accessible line_detail_types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can insert their own detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can update their own detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can delete their own detail types" ON public.line_detail_types;

CREATE POLICY "Environment read access for line_detail_types"
ON public.line_detail_types FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for line_detail_types"
ON public.line_detail_types FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for line_detail_types"
ON public.line_detail_types FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for line_detail_types"
ON public.line_detail_types FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- custom_kpis
DROP POLICY IF EXISTS "Users can view their own custom kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can view accessible custom_kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can insert their own custom kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can update their own custom kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can delete their own custom kpis" ON public.custom_kpis;

CREATE POLICY "Environment read access for custom_kpis"
ON public.custom_kpis FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for custom_kpis"
ON public.custom_kpis FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for custom_kpis"
ON public.custom_kpis FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for custom_kpis"
ON public.custom_kpis FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- creative_templates
DROP POLICY IF EXISTS "Users can view their own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can view accessible creative_templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.creative_templates;

CREATE POLICY "Environment read access for creative_templates"
ON public.creative_templates FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for creative_templates"
ON public.creative_templates FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for creative_templates"
ON public.creative_templates FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for creative_templates"
ON public.creative_templates FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- plan_subdivisions
DROP POLICY IF EXISTS "Users can view their own subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can view accessible plan_subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can insert their own subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can update their own subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can delete their own subdivisions" ON public.plan_subdivisions;

CREATE POLICY "Environment read access for plan_subdivisions"
ON public.plan_subdivisions FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for plan_subdivisions"
ON public.plan_subdivisions FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for plan_subdivisions"
ON public.plan_subdivisions FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for plan_subdivisions"
ON public.plan_subdivisions FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- plan_budget_distributions
DROP POLICY IF EXISTS "Users can view their own distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can view accessible plan_budget_distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can insert their own distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can update their own distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can delete their own distributions" ON public.plan_budget_distributions;

CREATE POLICY "Environment read access for plan_budget_distributions"
ON public.plan_budget_distributions FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for plan_budget_distributions"
ON public.plan_budget_distributions FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for plan_budget_distributions"
ON public.plan_budget_distributions FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for plan_budget_distributions"
ON public.plan_budget_distributions FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- media_line_monthly_budgets
DROP POLICY IF EXISTS "Users can view their own monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can view accessible media_line_monthly_budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can insert their own monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can update their own monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can delete their own monthly budgets" ON public.media_line_monthly_budgets;

CREATE POLICY "Environment read access for media_line_monthly_budgets"
ON public.media_line_monthly_budgets FOR SELECT
USING (public.has_environment_section_access(environment_id, 'media_plans', 'view'));

CREATE POLICY "Environment insert access for media_line_monthly_budgets"
ON public.media_line_monthly_budgets FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment update access for media_line_monthly_budgets"
ON public.media_line_monthly_budgets FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'edit'));

CREATE POLICY "Environment delete access for media_line_monthly_budgets"
ON public.media_line_monthly_budgets FOR DELETE
USING (public.has_environment_section_access(environment_id, 'media_plans', 'admin'));

-- behavioral_segmentations
DROP POLICY IF EXISTS "Users can view their own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can view accessible behavioral_segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can insert their own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can update their own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can delete their own segmentations" ON public.behavioral_segmentations;

CREATE POLICY "Environment read access for behavioral_segmentations"
ON public.behavioral_segmentations FOR SELECT
USING (public.has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for behavioral_segmentations"
ON public.behavioral_segmentations FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for behavioral_segmentations"
ON public.behavioral_segmentations FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for behavioral_segmentations"
ON public.behavioral_segmentations FOR DELETE
USING (public.has_environment_section_access(environment_id, 'library', 'admin'));

-- data_sources
DROP POLICY IF EXISTS "Users can view their own data sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can view accessible data_sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can insert their own data sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can insert in accessible environments" ON public.data_sources;
DROP POLICY IF EXISTS "Users can update their own data sources" ON public.data_sources;
DROP POLICY IF EXISTS "Users can delete their own data sources" ON public.data_sources;

CREATE POLICY "Environment read access for data_sources"
ON public.data_sources FOR SELECT
USING (public.has_environment_section_access(environment_id, 'reports', 'view'));

CREATE POLICY "Environment insert access for data_sources"
ON public.data_sources FOR INSERT
WITH CHECK (public.has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment update access for data_sources"
ON public.data_sources FOR UPDATE
USING (public.has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment delete access for data_sources"
ON public.data_sources FOR DELETE
USING (public.has_environment_section_access(environment_id, 'reports', 'admin'));
