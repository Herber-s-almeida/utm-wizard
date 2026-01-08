export interface MediaPlan {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  client: string | null;
  campaign: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  status: 'draft' | 'active' | 'completed' | 'paused';
  objectives: string[] | null;
  kpis: Record<string, number> | null;
  default_url: string | null;
  created_at: string;
  updated_at: string;
}

export type FunnelStage = 'top' | 'middle' | 'bottom';

export interface MediaLine {
  id: string;
  media_plan_id: string;
  user_id: string;
  platform: string;
  format: string | null;
  objective: string | null;
  funnel_stage: FunnelStage;
  placement: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  destination_url: string | null;
  notes: string | null;
  // New fields referencing library entities
  subdivision_id: string | null;
  moment_id: string | null;
  funnel_stage_id: string | null;
  medium_id: string | null;
  vehicle_id: string | null;
  channel_id: string | null;
  target_id: string | null;
  creative_template_id: string | null;
  status_id: string | null;
  budget_allocation: 'campaign' | 'creative';
  percentage_of_plan: number;
  line_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaCreative {
  id: string;
  media_line_id: string;
  user_id: string;
  name: string;
  format_id: string | null;
  copy_text: string | null;
  creative_type: string;
  asset_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanBudgetDistribution {
  id: string;
  media_plan_id: string;
  user_id: string;
  distribution_type: 'subdivision' | 'moment' | 'funnel_stage' | 'temporal';
  reference_id: string | null;
  parent_distribution_id: string | null;
  percentage: number;
  amount: number;
  temporal_period: string | null;
  temporal_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaLineMonthlyBudget {
  id: string;
  media_line_id: string;
  user_id: string;
  month_date: string; // ISO date string (first day of month)
  amount: number;
  created_at: string;
  updated_at: string;
}

export const PLATFORMS = [
  'Google Ads',
  'Meta Ads',
  'LinkedIn Ads',
  'TikTok Ads',
  'Twitter/X Ads',
  'Pinterest Ads',
  'Spotify Ads',
  'YouTube Ads',
  'Display & Video 360',
  'Programática',
  'Native Ads',
  'Outro',
];

export const FORMATS = [
  'Search',
  'Display',
  'Video',
  'Stories',
  'Reels',
  'Carrossel',
  'Coleção',
  'Shopping',
  'Lead Ads',
  'App Install',
  'Audio',
  'Native',
  'Rich Media',
  'Outro',
];

export const FUNNEL_STAGES: { value: FunnelStage; label: string; description: string; color: string }[] = [
  { value: 'top', label: 'Topo', description: 'Awareness - Reconhecimento de marca', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { value: 'middle', label: 'Meio', description: 'Consideração - Interesse e engajamento', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { value: 'bottom', label: 'Fundo', description: 'Conversão - Ação e vendas', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
];

export const OBJECTIVES_BY_FUNNEL: Record<FunnelStage, string[]> = {
  top: ['Awareness', 'Alcance', 'Visualização de Vídeo'],
  middle: ['Tráfego', 'Engajamento', 'Geração de Leads'],
  bottom: ['Conversões', 'Vendas', 'Instalação de App'],
};

export const CREATIVE_TYPES = [
  'Imagem',
  'Vídeo',
  'Carrossel',
  'Stories',
  'Reels',
  'Texto',
  'HTML5',
  'Áudio',
  'Outro',
];

export const STATUS_LABELS: Record<MediaPlan['status'], string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  completed: 'Finalizado',
  paused: 'Pausado',
};

export const STATUS_COLORS: Record<MediaPlan['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/10 text-success',
  completed: 'bg-primary/10 text-primary',
  paused: 'bg-warning/10 text-warning',
};

export const KPI_OPTIONS = [
  { key: 'cpc', label: 'CPC (Custo por Clique)', unit: 'R$' },
  { key: 'cpl', label: 'CPL (Custo por Lead)', unit: 'R$' },
  { key: 'ctr', label: 'CTR (Taxa de Clique)', unit: '%' },
  { key: 'cpa', label: 'CPA (Custo por Aquisição)', unit: 'R$' },
  { key: 'cpm', label: 'CPM (Custo por Mil)', unit: 'R$' },
  { key: 'roas', label: 'ROAS (Retorno sobre Investimento)', unit: 'x' },
  { key: 'conversion_rate', label: 'Taxa de Conversão', unit: '%' },
];

export const TEMPORAL_GRANULARITY = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

// UTM generation helpers
export const getPlatformUtmDefaults = (platform: string): { source: string; medium: string } => {
  const map: Record<string, { source: string; medium: string }> = {
    'Google Ads': { source: 'google', medium: 'cpc' },
    'Meta Ads': { source: 'facebook', medium: 'paid_social' },
    'LinkedIn Ads': { source: 'linkedin', medium: 'paid_social' },
    'TikTok Ads': { source: 'tiktok', medium: 'paid_social' },
    'Twitter/X Ads': { source: 'twitter', medium: 'paid_social' },
    'Pinterest Ads': { source: 'pinterest', medium: 'paid_social' },
    'Spotify Ads': { source: 'spotify', medium: 'audio' },
    'YouTube Ads': { source: 'youtube', medium: 'video' },
    'Display & Video 360': { source: 'dv360', medium: 'programmatic' },
    'Programática': { source: 'programmatic', medium: 'display' },
    'Native Ads': { source: 'native', medium: 'native' },
  };
  return map[platform] || { source: platform.toLowerCase().replace(/\s+/g, '_'), medium: 'paid' };
};

export const generateUtmParams = (
  plan: MediaPlan,
  line: { platform: string; funnel_stage: FunnelStage; format?: string | null }
) => {
  const platformDefaults = getPlatformUtmDefaults(line.platform);
  const campaignSlug = plan.campaign?.toLowerCase().replace(/\s+/g, '_') || plan.name.toLowerCase().replace(/\s+/g, '_');
  
  return {
    utm_source: platformDefaults.source,
    utm_medium: platformDefaults.medium,
    utm_campaign: campaignSlug,
    utm_content: `${line.funnel_stage}_${line.format?.toLowerCase().replace(/\s+/g, '_') || 'default'}`,
    utm_term: '',
  };
};