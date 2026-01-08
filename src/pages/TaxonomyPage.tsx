import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaxonomyTable } from '@/components/taxonomy/TaxonomyTable';
import { useTaxonomyData } from '@/hooks/useTaxonomyData';
import { exportUtmsToXlsx } from '@/utils/exportUtmsToXlsx';
import { toast } from 'sonner';
import { usePlanBySlug, getPlanUrl } from '@/hooks/usePlanBySlug';
import { useEffect } from 'react';

export default function TaxonomyPage() {
  const { id: identifier } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch plan by slug or ID
  const { data: plan, isLoading: planLoading } = usePlanBySlug(identifier);

  // Redirect from ID to slug
  useEffect(() => {
    if (plan && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && plan.slug && identifier !== plan.slug) {
        navigate(`/media-plans/${plan.slug}/taxonomy`, { replace: true });
      }
    }
  }, [plan, identifier, navigate]);

  // Fetch taxonomy data using the actual plan ID
  const { data: taxonomyData, isLoading: taxonomyLoading, refetch } = useTaxonomyData(plan?.id || '');

  if (planLoading || taxonomyLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Plano não encontrado</p>
        </div>
      </DashboardLayout>
    );
  }
  
  const planUrl = getPlanUrl(plan);

  const validatedCount = taxonomyData?.filter(line => line.utm_validated).length || 0;
  const totalCount = taxonomyData?.length || 0;

  const handleExportXlsx = () => {
    if (!taxonomyData || taxonomyData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    
    exportUtmsToXlsx({
      planName: plan.name,
      campaignName: plan.campaign || plan.name,
      defaultUrl: plan.default_url,
      lines: taxonomyData,
    });
    toast.success('Arquivo XLSX exportado!');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={planUrl}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Taxonomia UTM</h1>
              <p className="text-muted-foreground text-sm">{plan.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Validados:</span>
              <span className={validatedCount === totalCount && totalCount > 0 ? 'text-green-600 font-medium' : ''}>
                {validatedCount}/{totalCount}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportXlsx}
              disabled={!taxonomyData || taxonomyData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar XLSX
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Gerenciamento de UTMs</CardTitle>
            <CardDescription>
              Visualize, edite e valide os parâmetros UTM de todas as linhas de mídia e seus criativos.
              Os slugs de source e medium são definidos na biblioteca de Veículos e Canais.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Taxonomy Table */}
        {taxonomyData && taxonomyData.length > 0 ? (
          <TaxonomyTable 
            data={taxonomyData} 
            planName={plan.campaign || plan.name}
            defaultUrl={plan.default_url}
            userId={user?.id || ''}
            onUpdate={refetch}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>Nenhuma linha de mídia encontrada neste plano.</p>
              <Link to={planUrl}>
                <Button variant="outline" className="mt-4">
                  Ir para o plano
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
