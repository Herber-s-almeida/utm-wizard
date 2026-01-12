import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanConfig {
  name: string;
  campaign: string;
  hierarchyOrder: string[];
  distributions: DistributionConfig[];
}

interface DistributionConfig {
  type: 'subdivision' | 'moment' | 'funnel_stage';
  itemId: string;
  amount: number;
  percentage: number;
  parentPath?: string; // For nested distributions
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Base data
    const userId = 'c99f696a-64a3-446e-8840-9eed8e1f553f';
    const clientId = 'edc245ab-c886-43fe-a26f-37730ce556f2';
    const totalBudget = 3000;
    const startDate = '2026-02-13';
    const endDate = '2026-06-13';

    // IDs
    const subdivisions = {
      curitiba: 'bd693313-fd06-4017-886d-c7a3157ea9d9',
      londrina: 'c776c451-08fa-4fdc-97e3-7641a4d1a951',
      toledo: '4fe8c8c6-6eaf-4d11-8fba-64a1b6e5875a',
    };

    const moments = {
      lancamento: '48d0bc91-f64a-4af9-857e-e078255ac7bb',
      perpetuo: 'c1dafa5f-dd4d-4232-a609-e0dd8815dc2e',
    };

    const funnelStages = {
      awareness: '9e0b1276-6b0a-4f0e-b751-96d46a2bfafd',
      consideracao: '80516a7c-ede8-46d1-b251-c3aa4442621f',
      conversao: 'cc6397be-77b4-488b-879e-67be11a8e984',
    };

    // Helper to calculate percentage
    const pct = (amount: number, total: number) => (amount / total) * 100;

    // All 15 plans configuration
    const plans: PlanConfig[] = [
      // Exemplo 1: Subdivisão only
      {
        name: 'Exemplo 1 Subdivisão',
        campaign: 'Teste Hierarquia 1',
        hierarchyOrder: ['subdivision'],
        distributions: [
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 1500, percentage: 50 },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 850, percentage: 28.33 },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 650, percentage: 21.67 },
        ],
      },
      // Exemplo 2: Momento only
      {
        name: 'Exemplo 2 Momento',
        campaign: 'Teste Hierarquia 2',
        hierarchyOrder: ['moment'],
        distributions: [
          { type: 'moment', itemId: moments.lancamento, amount: 1500, percentage: 50 },
          { type: 'moment', itemId: moments.perpetuo, amount: 1500, percentage: 50 },
        ],
      },
      // Exemplo 3: Fases only
      {
        name: 'Exemplo 3 Fases',
        campaign: 'Teste Hierarquia 3',
        hierarchyOrder: ['funnel_stage'],
        distributions: [
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 780, percentage: 26 },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 900, percentage: 30 },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 1320, percentage: 44 },
        ],
      },
      // Exemplo 4: Subdivisão → Momento
      {
        name: 'Exemplo 4 Subdivisão → Momento',
        campaign: 'Teste Hierarquia 4',
        hierarchyOrder: ['subdivision', 'moment'],
        distributions: [
          // Level 1
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 1500, percentage: 50 },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 850, percentage: 28.33 },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 650, percentage: 21.67 },
          // Level 2 - Curitiba
          { type: 'moment', itemId: moments.lancamento, amount: 750, percentage: 50, parentPath: 'curitiba' },
          { type: 'moment', itemId: moments.perpetuo, amount: 750, percentage: 50, parentPath: 'curitiba' },
          // Level 2 - Londrina
          { type: 'moment', itemId: moments.lancamento, amount: 425, percentage: 50, parentPath: 'londrina' },
          { type: 'moment', itemId: moments.perpetuo, amount: 425, percentage: 50, parentPath: 'londrina' },
          // Level 2 - Toledo
          { type: 'moment', itemId: moments.lancamento, amount: 325, percentage: 50, parentPath: 'toledo' },
          { type: 'moment', itemId: moments.perpetuo, amount: 325, percentage: 50, parentPath: 'toledo' },
        ],
      },
      // Exemplo 5: Momento → Subdivisão
      {
        name: 'Exemplo 5 Momento → Subdivisão',
        campaign: 'Teste Hierarquia 5',
        hierarchyOrder: ['moment', 'subdivision'],
        distributions: [
          // Level 1
          { type: 'moment', itemId: moments.lancamento, amount: 1500, percentage: 50 },
          { type: 'moment', itemId: moments.perpetuo, amount: 1500, percentage: 50 },
          // Level 2 - Lançamento
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 750, percentage: 50, parentPath: 'lancamento' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 425, percentage: 28.33, parentPath: 'lancamento' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 325, percentage: 21.67, parentPath: 'lancamento' },
          // Level 2 - Perpétuo
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 750, percentage: 50, parentPath: 'perpetuo' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 425, percentage: 28.33, parentPath: 'perpetuo' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 325, percentage: 21.67, parentPath: 'perpetuo' },
        ],
      },
      // Exemplo 6: Subdivisão → Fase
      {
        name: 'Exemplo 6 Subdivisão → Fase',
        campaign: 'Teste Hierarquia 6',
        hierarchyOrder: ['subdivision', 'funnel_stage'],
        distributions: [
          // Level 1
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 1500, percentage: 50 },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 850, percentage: 28.33 },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 650, percentage: 21.67 },
          // Level 2 - Curitiba
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 300, percentage: 20, parentPath: 'curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 500, percentage: 33.33, parentPath: 'curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 700, percentage: 46.67, parentPath: 'curitiba' },
          // Level 2 - Londrina
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 240, percentage: 28.24, parentPath: 'londrina' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 200, percentage: 23.53, parentPath: 'londrina' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 410, percentage: 48.24, parentPath: 'londrina' },
          // Level 2 - Toledo
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 240, percentage: 36.92, parentPath: 'toledo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 200, percentage: 30.77, parentPath: 'toledo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 210, percentage: 32.31, parentPath: 'toledo' },
        ],
      },
      // Exemplo 7: Fase → Subdivisão
      {
        name: 'Exemplo 7 Fase → Subdivisão',
        campaign: 'Teste Hierarquia 7',
        hierarchyOrder: ['funnel_stage', 'subdivision'],
        distributions: [
          // Level 1
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 780, percentage: 26 },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 900, percentage: 30 },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 1320, percentage: 44 },
          // Level 2 - Awareness
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 300, percentage: 38.46, parentPath: 'awareness' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 240, percentage: 30.77, parentPath: 'awareness' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 240, percentage: 30.77, parentPath: 'awareness' },
          // Level 2 - Consideração
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 500, percentage: 55.56, parentPath: 'consideracao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 200, percentage: 22.22, parentPath: 'consideracao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 200, percentage: 22.22, parentPath: 'consideracao' },
          // Level 2 - Conversão
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 700, percentage: 53.03, parentPath: 'conversao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 410, percentage: 31.06, parentPath: 'conversao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 210, percentage: 15.91, parentPath: 'conversao' },
        ],
      },
      // Exemplo 8: Momento → Fase
      {
        name: 'Exemplo 8 Momento → Fase',
        campaign: 'Teste Hierarquia 8',
        hierarchyOrder: ['moment', 'funnel_stage'],
        distributions: [
          // Level 1
          { type: 'moment', itemId: moments.lancamento, amount: 1500, percentage: 50 },
          { type: 'moment', itemId: moments.perpetuo, amount: 1500, percentage: 50 },
          // Level 2 - Lançamento
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 390, percentage: 26, parentPath: 'lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 450, percentage: 30, parentPath: 'lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 660, percentage: 44, parentPath: 'lancamento' },
          // Level 2 - Perpétuo
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 390, percentage: 26, parentPath: 'perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 450, percentage: 30, parentPath: 'perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 660, percentage: 44, parentPath: 'perpetuo' },
        ],
      },
      // Exemplo 9: Fase → Momento
      {
        name: 'Exemplo 9 Fase → Momento',
        campaign: 'Teste Hierarquia 9',
        hierarchyOrder: ['funnel_stage', 'moment'],
        distributions: [
          // Level 1
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 780, percentage: 26 },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 900, percentage: 30 },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 1320, percentage: 44 },
          // Level 2 - Awareness
          { type: 'moment', itemId: moments.lancamento, amount: 390, percentage: 50, parentPath: 'awareness' },
          { type: 'moment', itemId: moments.perpetuo, amount: 390, percentage: 50, parentPath: 'awareness' },
          // Level 2 - Consideração
          { type: 'moment', itemId: moments.lancamento, amount: 450, percentage: 50, parentPath: 'consideracao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 450, percentage: 50, parentPath: 'consideracao' },
          // Level 2 - Conversão
          { type: 'moment', itemId: moments.lancamento, amount: 660, percentage: 50, parentPath: 'conversao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 660, percentage: 50, parentPath: 'conversao' },
        ],
      },
      // Exemplo 10: Subdivisão → Momento → Fase
      {
        name: 'Exemplo 10 Subdivisão → Momento → Fase',
        campaign: 'Teste Hierarquia 10',
        hierarchyOrder: ['subdivision', 'moment', 'funnel_stage'],
        distributions: [
          // Level 1 - Subdivisões
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 1500, percentage: 50 },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 850, percentage: 28.33 },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 650, percentage: 21.67 },
          // Level 2 - Momentos (Curitiba)
          { type: 'moment', itemId: moments.lancamento, amount: 750, percentage: 50, parentPath: 'curitiba' },
          { type: 'moment', itemId: moments.perpetuo, amount: 750, percentage: 50, parentPath: 'curitiba' },
          // Level 2 - Momentos (Londrina)
          { type: 'moment', itemId: moments.lancamento, amount: 425, percentage: 50, parentPath: 'londrina' },
          { type: 'moment', itemId: moments.perpetuo, amount: 425, percentage: 50, parentPath: 'londrina' },
          // Level 2 - Momentos (Toledo)
          { type: 'moment', itemId: moments.lancamento, amount: 325, percentage: 50, parentPath: 'toledo' },
          { type: 'moment', itemId: moments.perpetuo, amount: 325, percentage: 50, parentPath: 'toledo' },
          // Level 3 - Fases (Curitiba > Lançamento)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 150, percentage: 20, parentPath: 'curitiba_lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 250, percentage: 33.33, parentPath: 'curitiba_lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 350, percentage: 46.67, parentPath: 'curitiba_lancamento' },
          // Level 3 - Fases (Curitiba > Perpétuo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 150, percentage: 20, parentPath: 'curitiba_perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 250, percentage: 33.33, parentPath: 'curitiba_perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 350, percentage: 46.67, parentPath: 'curitiba_perpetuo' },
          // Level 3 - Fases (Londrina > Lançamento)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 28.24, parentPath: 'londrina_lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 23.53, parentPath: 'londrina_lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 205, percentage: 48.24, parentPath: 'londrina_lancamento' },
          // Level 3 - Fases (Londrina > Perpétuo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 28.24, parentPath: 'londrina_perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 23.53, parentPath: 'londrina_perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 205, percentage: 48.24, parentPath: 'londrina_perpetuo' },
          // Level 3 - Fases (Toledo > Lançamento)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 36.92, parentPath: 'toledo_lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 30.77, parentPath: 'toledo_lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 105, percentage: 32.31, parentPath: 'toledo_lancamento' },
          // Level 3 - Fases (Toledo > Perpétuo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 36.92, parentPath: 'toledo_perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 30.77, parentPath: 'toledo_perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 105, percentage: 32.31, parentPath: 'toledo_perpetuo' },
        ],
      },
      // Exemplo 11: Subdivisão → Fase → Momento
      {
        name: 'Exemplo 11 Subdivisão → Fase → Momento',
        campaign: 'Teste Hierarquia 11',
        hierarchyOrder: ['subdivision', 'funnel_stage', 'moment'],
        distributions: [
          // Level 1 - Subdivisões
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 1500, percentage: 50 },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 850, percentage: 28.33 },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 650, percentage: 21.67 },
          // Level 2 - Fases (Curitiba)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 300, percentage: 20, parentPath: 'curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 500, percentage: 33.33, parentPath: 'curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 700, percentage: 46.67, parentPath: 'curitiba' },
          // Level 2 - Fases (Londrina)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 240, percentage: 28.24, parentPath: 'londrina' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 200, percentage: 23.53, parentPath: 'londrina' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 410, percentage: 48.24, parentPath: 'londrina' },
          // Level 2 - Fases (Toledo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 240, percentage: 36.92, parentPath: 'toledo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 200, percentage: 30.77, parentPath: 'toledo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 210, percentage: 32.31, parentPath: 'toledo' },
          // Level 3 - Momentos (Curitiba > Awareness)
          { type: 'moment', itemId: moments.lancamento, amount: 150, percentage: 50, parentPath: 'curitiba_awareness' },
          { type: 'moment', itemId: moments.perpetuo, amount: 150, percentage: 50, parentPath: 'curitiba_awareness' },
          // Level 3 - Momentos (Curitiba > Consideração)
          { type: 'moment', itemId: moments.lancamento, amount: 250, percentage: 50, parentPath: 'curitiba_consideracao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 250, percentage: 50, parentPath: 'curitiba_consideracao' },
          // Level 3 - Momentos (Curitiba > Conversão)
          { type: 'moment', itemId: moments.lancamento, amount: 350, percentage: 50, parentPath: 'curitiba_conversao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 350, percentage: 50, parentPath: 'curitiba_conversao' },
          // Level 3 - Momentos (Londrina > Awareness)
          { type: 'moment', itemId: moments.lancamento, amount: 120, percentage: 50, parentPath: 'londrina_awareness' },
          { type: 'moment', itemId: moments.perpetuo, amount: 120, percentage: 50, parentPath: 'londrina_awareness' },
          // Level 3 - Momentos (Londrina > Consideração)
          { type: 'moment', itemId: moments.lancamento, amount: 100, percentage: 50, parentPath: 'londrina_consideracao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 100, percentage: 50, parentPath: 'londrina_consideracao' },
          // Level 3 - Momentos (Londrina > Conversão)
          { type: 'moment', itemId: moments.lancamento, amount: 205, percentage: 50, parentPath: 'londrina_conversao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 205, percentage: 50, parentPath: 'londrina_conversao' },
          // Level 3 - Momentos (Toledo > Awareness)
          { type: 'moment', itemId: moments.lancamento, amount: 120, percentage: 50, parentPath: 'toledo_awareness' },
          { type: 'moment', itemId: moments.perpetuo, amount: 120, percentage: 50, parentPath: 'toledo_awareness' },
          // Level 3 - Momentos (Toledo > Consideração)
          { type: 'moment', itemId: moments.lancamento, amount: 100, percentage: 50, parentPath: 'toledo_consideracao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 100, percentage: 50, parentPath: 'toledo_consideracao' },
          // Level 3 - Momentos (Toledo > Conversão)
          { type: 'moment', itemId: moments.lancamento, amount: 105, percentage: 50, parentPath: 'toledo_conversao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 105, percentage: 50, parentPath: 'toledo_conversao' },
        ],
      },
      // Exemplo 12: Momento → Subdivisão → Fase
      {
        name: 'Exemplo 12 Momento → Subdivisão → Fase',
        campaign: 'Teste Hierarquia 12',
        hierarchyOrder: ['moment', 'subdivision', 'funnel_stage'],
        distributions: [
          // Level 1 - Momentos
          { type: 'moment', itemId: moments.lancamento, amount: 1500, percentage: 50 },
          { type: 'moment', itemId: moments.perpetuo, amount: 1500, percentage: 50 },
          // Level 2 - Subdivisões (Lançamento)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 750, percentage: 50, parentPath: 'lancamento' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 425, percentage: 28.33, parentPath: 'lancamento' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 325, percentage: 21.67, parentPath: 'lancamento' },
          // Level 2 - Subdivisões (Perpétuo)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 750, percentage: 50, parentPath: 'perpetuo' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 425, percentage: 28.33, parentPath: 'perpetuo' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 325, percentage: 21.67, parentPath: 'perpetuo' },
          // Level 3 - Fases (Lançamento > Curitiba)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 150, percentage: 20, parentPath: 'lancamento_curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 250, percentage: 33.33, parentPath: 'lancamento_curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 350, percentage: 46.67, parentPath: 'lancamento_curitiba' },
          // Level 3 - Fases (Lançamento > Londrina)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 28.24, parentPath: 'lancamento_londrina' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 23.53, parentPath: 'lancamento_londrina' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 205, percentage: 48.24, parentPath: 'lancamento_londrina' },
          // Level 3 - Fases (Lançamento > Toledo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 36.92, parentPath: 'lancamento_toledo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 30.77, parentPath: 'lancamento_toledo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 105, percentage: 32.31, parentPath: 'lancamento_toledo' },
          // Level 3 - Fases (Perpétuo > Curitiba)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 150, percentage: 20, parentPath: 'perpetuo_curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 250, percentage: 33.33, parentPath: 'perpetuo_curitiba' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 350, percentage: 46.67, parentPath: 'perpetuo_curitiba' },
          // Level 3 - Fases (Perpétuo > Londrina)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 28.24, parentPath: 'perpetuo_londrina' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 23.53, parentPath: 'perpetuo_londrina' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 205, percentage: 48.24, parentPath: 'perpetuo_londrina' },
          // Level 3 - Fases (Perpétuo > Toledo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 120, percentage: 36.92, parentPath: 'perpetuo_toledo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 100, percentage: 30.77, parentPath: 'perpetuo_toledo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 105, percentage: 32.31, parentPath: 'perpetuo_toledo' },
        ],
      },
      // Exemplo 13: Momento → Fase → Subdivisão
      {
        name: 'Exemplo 13 Momento → Fase → Subdivisão',
        campaign: 'Teste Hierarquia 13',
        hierarchyOrder: ['moment', 'funnel_stage', 'subdivision'],
        distributions: [
          // Level 1 - Momentos
          { type: 'moment', itemId: moments.lancamento, amount: 1500, percentage: 50 },
          { type: 'moment', itemId: moments.perpetuo, amount: 1500, percentage: 50 },
          // Level 2 - Fases (Lançamento)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 390, percentage: 26, parentPath: 'lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 450, percentage: 30, parentPath: 'lancamento' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 660, percentage: 44, parentPath: 'lancamento' },
          // Level 2 - Fases (Perpétuo)
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 390, percentage: 26, parentPath: 'perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 450, percentage: 30, parentPath: 'perpetuo' },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 660, percentage: 44, parentPath: 'perpetuo' },
          // Level 3 - Subdivisões (Lançamento > Awareness)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 150, percentage: 38.46, parentPath: 'lancamento_awareness' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 120, percentage: 30.77, parentPath: 'lancamento_awareness' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 120, percentage: 30.77, parentPath: 'lancamento_awareness' },
          // Level 3 - Subdivisões (Lançamento > Consideração)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 250, percentage: 55.56, parentPath: 'lancamento_consideracao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 100, percentage: 22.22, parentPath: 'lancamento_consideracao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 100, percentage: 22.22, parentPath: 'lancamento_consideracao' },
          // Level 3 - Subdivisões (Lançamento > Conversão)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 350, percentage: 53.03, parentPath: 'lancamento_conversao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 205, percentage: 31.06, parentPath: 'lancamento_conversao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 105, percentage: 15.91, parentPath: 'lancamento_conversao' },
          // Level 3 - Subdivisões (Perpétuo > Awareness)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 150, percentage: 38.46, parentPath: 'perpetuo_awareness' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 120, percentage: 30.77, parentPath: 'perpetuo_awareness' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 120, percentage: 30.77, parentPath: 'perpetuo_awareness' },
          // Level 3 - Subdivisões (Perpétuo > Consideração)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 250, percentage: 55.56, parentPath: 'perpetuo_consideracao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 100, percentage: 22.22, parentPath: 'perpetuo_consideracao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 100, percentage: 22.22, parentPath: 'perpetuo_consideracao' },
          // Level 3 - Subdivisões (Perpétuo > Conversão)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 350, percentage: 53.03, parentPath: 'perpetuo_conversao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 205, percentage: 31.06, parentPath: 'perpetuo_conversao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 105, percentage: 15.91, parentPath: 'perpetuo_conversao' },
        ],
      },
      // Exemplo 14: Fase → Subdivisão → Momento
      {
        name: 'Exemplo 14 Fase → Subdivisão → Momento',
        campaign: 'Teste Hierarquia 14',
        hierarchyOrder: ['funnel_stage', 'subdivision', 'moment'],
        distributions: [
          // Level 1 - Fases
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 780, percentage: 26 },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 900, percentage: 30 },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 1320, percentage: 44 },
          // Level 2 - Subdivisões (Awareness)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 300, percentage: 38.46, parentPath: 'awareness' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 240, percentage: 30.77, parentPath: 'awareness' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 240, percentage: 30.77, parentPath: 'awareness' },
          // Level 2 - Subdivisões (Consideração)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 500, percentage: 55.56, parentPath: 'consideracao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 200, percentage: 22.22, parentPath: 'consideracao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 200, percentage: 22.22, parentPath: 'consideracao' },
          // Level 2 - Subdivisões (Conversão)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 700, percentage: 53.03, parentPath: 'conversao' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 410, percentage: 31.06, parentPath: 'conversao' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 210, percentage: 15.91, parentPath: 'conversao' },
          // Level 3 - Momentos (Awareness > Curitiba)
          { type: 'moment', itemId: moments.lancamento, amount: 150, percentage: 50, parentPath: 'awareness_curitiba' },
          { type: 'moment', itemId: moments.perpetuo, amount: 150, percentage: 50, parentPath: 'awareness_curitiba' },
          // Level 3 - Momentos (Awareness > Londrina)
          { type: 'moment', itemId: moments.lancamento, amount: 120, percentage: 50, parentPath: 'awareness_londrina' },
          { type: 'moment', itemId: moments.perpetuo, amount: 120, percentage: 50, parentPath: 'awareness_londrina' },
          // Level 3 - Momentos (Awareness > Toledo)
          { type: 'moment', itemId: moments.lancamento, amount: 120, percentage: 50, parentPath: 'awareness_toledo' },
          { type: 'moment', itemId: moments.perpetuo, amount: 120, percentage: 50, parentPath: 'awareness_toledo' },
          // Level 3 - Momentos (Consideração > Curitiba)
          { type: 'moment', itemId: moments.lancamento, amount: 250, percentage: 50, parentPath: 'consideracao_curitiba' },
          { type: 'moment', itemId: moments.perpetuo, amount: 250, percentage: 50, parentPath: 'consideracao_curitiba' },
          // Level 3 - Momentos (Consideração > Londrina)
          { type: 'moment', itemId: moments.lancamento, amount: 100, percentage: 50, parentPath: 'consideracao_londrina' },
          { type: 'moment', itemId: moments.perpetuo, amount: 100, percentage: 50, parentPath: 'consideracao_londrina' },
          // Level 3 - Momentos (Consideração > Toledo)
          { type: 'moment', itemId: moments.lancamento, amount: 100, percentage: 50, parentPath: 'consideracao_toledo' },
          { type: 'moment', itemId: moments.perpetuo, amount: 100, percentage: 50, parentPath: 'consideracao_toledo' },
          // Level 3 - Momentos (Conversão > Curitiba)
          { type: 'moment', itemId: moments.lancamento, amount: 350, percentage: 50, parentPath: 'conversao_curitiba' },
          { type: 'moment', itemId: moments.perpetuo, amount: 350, percentage: 50, parentPath: 'conversao_curitiba' },
          // Level 3 - Momentos (Conversão > Londrina)
          { type: 'moment', itemId: moments.lancamento, amount: 205, percentage: 50, parentPath: 'conversao_londrina' },
          { type: 'moment', itemId: moments.perpetuo, amount: 205, percentage: 50, parentPath: 'conversao_londrina' },
          // Level 3 - Momentos (Conversão > Toledo)
          { type: 'moment', itemId: moments.lancamento, amount: 105, percentage: 50, parentPath: 'conversao_toledo' },
          { type: 'moment', itemId: moments.perpetuo, amount: 105, percentage: 50, parentPath: 'conversao_toledo' },
        ],
      },
      // Exemplo 15: Fase → Momento → Subdivisão
      {
        name: 'Exemplo 15 Fase → Momento → Subdivisão',
        campaign: 'Teste Hierarquia 15',
        hierarchyOrder: ['funnel_stage', 'moment', 'subdivision'],
        distributions: [
          // Level 1 - Fases
          { type: 'funnel_stage', itemId: funnelStages.awareness, amount: 780, percentage: 26 },
          { type: 'funnel_stage', itemId: funnelStages.consideracao, amount: 900, percentage: 30 },
          { type: 'funnel_stage', itemId: funnelStages.conversao, amount: 1320, percentage: 44 },
          // Level 2 - Momentos (Awareness)
          { type: 'moment', itemId: moments.lancamento, amount: 390, percentage: 50, parentPath: 'awareness' },
          { type: 'moment', itemId: moments.perpetuo, amount: 390, percentage: 50, parentPath: 'awareness' },
          // Level 2 - Momentos (Consideração)
          { type: 'moment', itemId: moments.lancamento, amount: 450, percentage: 50, parentPath: 'consideracao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 450, percentage: 50, parentPath: 'consideracao' },
          // Level 2 - Momentos (Conversão)
          { type: 'moment', itemId: moments.lancamento, amount: 660, percentage: 50, parentPath: 'conversao' },
          { type: 'moment', itemId: moments.perpetuo, amount: 660, percentage: 50, parentPath: 'conversao' },
          // Level 3 - Subdivisões (Awareness > Lançamento)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 150, percentage: 38.46, parentPath: 'awareness_lancamento' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 120, percentage: 30.77, parentPath: 'awareness_lancamento' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 120, percentage: 30.77, parentPath: 'awareness_lancamento' },
          // Level 3 - Subdivisões (Awareness > Perpétuo)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 150, percentage: 38.46, parentPath: 'awareness_perpetuo' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 120, percentage: 30.77, parentPath: 'awareness_perpetuo' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 120, percentage: 30.77, parentPath: 'awareness_perpetuo' },
          // Level 3 - Subdivisões (Consideração > Lançamento)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 250, percentage: 55.56, parentPath: 'consideracao_lancamento' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 100, percentage: 22.22, parentPath: 'consideracao_lancamento' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 100, percentage: 22.22, parentPath: 'consideracao_lancamento' },
          // Level 3 - Subdivisões (Consideração > Perpétuo)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 250, percentage: 55.56, parentPath: 'consideracao_perpetuo' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 100, percentage: 22.22, parentPath: 'consideracao_perpetuo' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 100, percentage: 22.22, parentPath: 'consideracao_perpetuo' },
          // Level 3 - Subdivisões (Conversão > Lançamento)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 350, percentage: 53.03, parentPath: 'conversao_lancamento' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 205, percentage: 31.06, parentPath: 'conversao_lancamento' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 105, percentage: 15.91, parentPath: 'conversao_lancamento' },
          // Level 3 - Subdivisões (Conversão > Perpétuo)
          { type: 'subdivision', itemId: subdivisions.curitiba, amount: 350, percentage: 53.03, parentPath: 'conversao_perpetuo' },
          { type: 'subdivision', itemId: subdivisions.londrina, amount: 205, percentage: 31.06, parentPath: 'conversao_perpetuo' },
          { type: 'subdivision', itemId: subdivisions.toledo, amount: 105, percentage: 15.91, parentPath: 'conversao_perpetuo' },
        ],
      },
    ];

    const results: any[] = [];

    // Create each plan
    for (const planConfig of plans) {
      console.log(`Creating plan: ${planConfig.name}`);

      // 1. Create the media plan
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .insert({
          name: planConfig.name,
          campaign: planConfig.campaign,
          client_id: clientId,
          user_id: userId,
          total_budget: totalBudget,
          start_date: startDate,
          end_date: endDate,
          hierarchy_order: planConfig.hierarchyOrder,
          status: 'active',
          default_url: 'https://graduacao.pucpr.br/',
        })
        .select()
        .single();

      if (planError) {
        console.error(`Error creating plan ${planConfig.name}:`, planError);
        results.push({ plan: planConfig.name, error: planError.message });
        continue;
      }

      console.log(`Plan created: ${plan.id}`);

      // 2. Create distributions
      // Map to store distribution IDs by path
      const distributionIdMap: Record<string, string> = {};

      // Group distributions by level (based on parentPath)
      const level1Dists = planConfig.distributions.filter(d => !d.parentPath);
      const level2Dists = planConfig.distributions.filter(d => d.parentPath && !d.parentPath.includes('_'));
      const level3Dists = planConfig.distributions.filter(d => d.parentPath && d.parentPath.includes('_'));

      // Insert level 1 distributions
      for (const dist of level1Dists) {
        const { data: distData, error: distError } = await supabase
          .from('plan_budget_distributions')
          .insert({
            media_plan_id: plan.id,
            user_id: userId,
            distribution_type: dist.type,
            reference_id: dist.itemId,
            percentage: dist.percentage,
            amount: dist.amount,
            parent_distribution_id: null,
            start_date: startDate,
            end_date: endDate,
          })
          .select()
          .single();

        if (distError) {
          console.error(`Error creating level 1 distribution:`, distError);
        } else {
          // Create a key based on the item
          const key = getItemKey(dist);
          distributionIdMap[key] = distData.id;
          console.log(`Level 1 dist created: ${key} -> ${distData.id}`);
        }
      }

      // Insert level 2 distributions
      for (const dist of level2Dists) {
        const parentId = distributionIdMap[dist.parentPath!];
        if (!parentId) {
          console.error(`Parent not found for path: ${dist.parentPath}`);
          continue;
        }

        const { data: distData, error: distError } = await supabase
          .from('plan_budget_distributions')
          .insert({
            media_plan_id: plan.id,
            user_id: userId,
            distribution_type: dist.type,
            reference_id: dist.itemId,
            percentage: dist.percentage,
            amount: dist.amount,
            parent_distribution_id: parentId,
            start_date: startDate,
            end_date: endDate,
          })
          .select()
          .single();

        if (distError) {
          console.error(`Error creating level 2 distribution:`, distError);
        } else {
          const key = `${dist.parentPath}_${getItemKey(dist)}`;
          distributionIdMap[key] = distData.id;
          console.log(`Level 2 dist created: ${key} -> ${distData.id}`);
        }
      }

      // Insert level 3 distributions
      for (const dist of level3Dists) {
        const parentId = distributionIdMap[dist.parentPath!];
        if (!parentId) {
          console.error(`Parent not found for path: ${dist.parentPath}`);
          continue;
        }

        const { data: distData, error: distError } = await supabase
          .from('plan_budget_distributions')
          .insert({
            media_plan_id: plan.id,
            user_id: userId,
            distribution_type: dist.type,
            reference_id: dist.itemId,
            percentage: dist.percentage,
            amount: dist.amount,
            parent_distribution_id: parentId,
            start_date: startDate,
            end_date: endDate,
          })
          .select()
          .single();

        if (distError) {
          console.error(`Error creating level 3 distribution:`, distError);
        } else {
          const key = `${dist.parentPath}_${getItemKey(dist)}`;
          console.log(`Level 3 dist created: ${key} -> ${distData.id}`);
        }
      }

      results.push({ 
        plan: planConfig.name, 
        planId: plan.id, 
        distributionsCreated: Object.keys(distributionIdMap).length 
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${results.length} plans`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error seeding test plans:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to get a consistent key for an item
function getItemKey(dist: DistributionConfig): string {
  const subdivisions: Record<string, string> = {
    'bd693313-fd06-4017-886d-c7a3157ea9d9': 'curitiba',
    'c776c451-08fa-4fdc-97e3-7641a4d1a951': 'londrina',
    '4fe8c8c6-6eaf-4d11-8fba-64a1b6e5875a': 'toledo',
  };
  const moments: Record<string, string> = {
    '48d0bc91-f64a-4af9-857e-e078255ac7bb': 'lancamento',
    'c1dafa5f-dd4d-4232-a609-e0dd8815dc2e': 'perpetuo',
  };
  const funnelStages: Record<string, string> = {
    '9e0b1276-6b0a-4f0e-b751-96d46a2bfafd': 'awareness',
    '80516a7c-ede8-46d1-b251-c3aa4442621f': 'consideracao',
    'cc6397be-77b4-488b-879e-67be11a8e984': 'conversao',
  };

  if (dist.type === 'subdivision') {
    return subdivisions[dist.itemId] || dist.itemId;
  } else if (dist.type === 'moment') {
    return moments[dist.itemId] || dist.itemId;
  } else {
    return funnelStages[dist.itemId] || dist.itemId;
  }
}
