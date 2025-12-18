export interface MediaPlan {
  id: string;
  user_id: string;
  name: string;
  client: string | null;
  campaign: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  status: 'draft' | 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface MediaLine {
  id: string;
  media_plan_id: string;
  user_id: string;
  platform: string;
  format: string | null;
  objective: string | null;
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

export const OBJECTIVES = [
  'Awareness',
  'Alcance',
  'Tráfego',
  'Engajamento',
  'Visualização de Vídeo',
  'Geração de Leads',
  'Conversões',
  'Vendas',
  'Instalação de App',
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
