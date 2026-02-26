import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MediaLine } from '@/types/media';
import { useReportData } from '@/hooks/useReportData';
import { ReportsTable } from '@/components/reports/ReportsTable';
import { usePlanBySlug, getPlanUrl } from '@/hooks/usePlanBySlug';
import { useEffect } from 'react';

export default function ReportSourceDetailPage() {
  const { id: identifier, sourceId } = useParams<{ id: string; sourceId: string }>();
  const navigate = useNavigate();

  const { data: plan, isLoading: planLoading } = usePlanBySlug(identifier);
  const planId = plan?.id;

  useEffect(() => {
    if (plan && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && plan.slug && identifier !== plan.slug) {
        navigate(`/media-plans/${plan.slug}/reports/source/${sourceId}`, { replace: true });
      }
    }
  }, [plan, identifier, navigate, sourceId]);

  const { data: mediaLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['media-lines', planId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_lines').select('*').eq('media_plan_id', planId);
      if (error) throw error;
      return data as MediaLine[];
    },
    enabled: !!planId,
  });

  const { data: sourceImport, isLoading: sourceLoading } = useQuery({
    queryKey: ['report-import-source', sourceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('report_imports').select('*').eq('id', sourceId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!sourceId,
  });

  const { data: reportData = [], isLoading: dataLoading } = useReportData(planId || '');

  const isLoading = planLoading || linesLoading || dataLoading || sourceLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan || !sourceImport) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Fonte de dados não encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  const sourceData = reportData.filter(r => r.import_id === sourceId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${getPlanUrl(plan)}/reports`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">{sourceImport.source_name}</h1>
            <p className="text-muted-foreground">{plan.name}</p>
          </div>
        </div>

        <ReportsTable
          reportData={sourceData}
          mediaLines={mediaLines}
          planId={planId!}
          planName={`${plan.name} - ${sourceImport.source_name}`}
        />
      </div>
    </DashboardLayout>
  );
}
