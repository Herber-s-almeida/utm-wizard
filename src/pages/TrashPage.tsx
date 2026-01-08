import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, RotateCcw, FileText, Library, Layers, Search, AlertTriangle } from 'lucide-react';
import { useMediaPlans } from '@/hooks/useConfigData';
import { useTrashedMediaLines, useTrashedLibraryItems } from '@/hooks/useTrashedItems';
import { useSoftDeleteMutations } from '@/hooks/useSoftDelete';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrashPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('plans');
  
  const { trashedPlans, restore: restorePlan, permanentDelete: permanentDeletePlan } = useMediaPlans();
  const trashedLines = useTrashedMediaLines();
  const trashedLibrary = useTrashedLibraryItems();
  const queryClient = useQueryClient();

  // Library item mutations
  const restoreLibraryItem = async (type: string, id: string) => {
    try {
      const { error } = await supabase
        .from(type as any)
        .update({ deleted_at: null, is_active: true })
        .eq('id', id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['library_items', 'trashed'] });
      queryClient.invalidateQueries({ queryKey: [type] });
      toast.success('Item restaurado!');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Erro ao restaurar item');
    }
  };

  const permanentDeleteLibraryItem = async (type: string, id: string) => {
    try {
      const { data, error } = await supabase
        .from(type as any)
        .delete()
        .eq('id', id)
        .select('id');
      
      if (error) {
        if (error.code === '23503') {
          throw new Error('Este item está em uso e não pode ser excluído.');
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Item não encontrado ou você não tem permissão.');
      }
      
      queryClient.invalidateQueries({ queryKey: ['library_items', 'trashed'] });
      queryClient.invalidateQueries({ queryKey: [type] });
      toast.success('Item excluído permanentemente!');
    } catch (error: any) {
      console.error('Permanent delete error:', error);
      toast.error(error.message || 'Erro ao excluir item');
    }
  };

  // Filter items based on search
  const filteredPlans = trashedPlans.data?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredLines = trashedLines.data?.filter(l => 
    l.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.line_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.media_plans as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredLibrary = trashedLibrary.data?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.typeLabel.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const plansCount = trashedPlans.data?.length || 0;
  const linesCount = trashedLines.data?.length || 0;
  const libraryCount = trashedLibrary.data?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Lixeira</h1>
            <p className="text-muted-foreground">
              Gerencie itens arquivados. Restaure ou exclua permanentemente.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na lixeira..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Planos
            {plansCount > 0 && <Badge variant="secondary" className="ml-1">{plansCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="lines" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Linhas
            {linesCount > 0 && <Badge variant="secondary" className="ml-1">{linesCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Biblioteca
            {libraryCount > 0 && <Badge variant="secondary" className="ml-1">{libraryCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos de Mídia Arquivados</CardTitle>
              <CardDescription>
                Planos movidos para a lixeira. Ao excluir permanentemente, todas as linhas e dados associados serão removidos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trashedPlans.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum plano na lixeira</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Arquivado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map(plan => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.client || '-'}</TableCell>
                        <TableCell>{plan.deleted_at ? formatDate(plan.deleted_at) : '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restorePlan.mutate(plan.id)}
                              disabled={restorePlan.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Excluir permanentemente?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O plano "{plan.name}" e todas as suas linhas, versões e dados associados serão excluídos permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => permanentDeletePlan.mutate(plan.id)}
                                  >
                                    Excluir permanentemente
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lines Tab */}
        <TabsContent value="lines">
          <Card>
            <CardHeader>
              <CardTitle>Linhas de Mídia Arquivadas</CardTitle>
              <CardDescription>
                Linhas removidas dos planos. Restaure para devolvê-las ao plano original.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trashedLines.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredLines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma linha na lixeira</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Arquivado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLines.map(line => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono text-sm">{line.line_code || '-'}</TableCell>
                        <TableCell>{line.platform}</TableCell>
                        <TableCell>{(line.media_plans as any)?.name || '-'}</TableCell>
                        <TableCell>{line.deleted_at ? formatDate(line.deleted_at) : '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => trashedLines.restore.mutate(line.id)}
                              disabled={trashedLines.restore.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir linha permanentemente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A linha será excluída permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => trashedLines.permanentDelete.mutate(line.id)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <CardTitle>Itens de Biblioteca Arquivados</CardTitle>
              <CardDescription>
                Subdivisões, momentos, veículos e outros itens de configuração arquivados. Itens em uso não podem ser excluídos permanentemente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trashedLibrary.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum item de biblioteca na lixeira</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Arquivado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLibrary.map(item => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.typeLabel}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.deleted_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreLibraryItem(item.type, item.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Se o item estiver em uso por linhas de mídia, a exclusão será bloqueada.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => permanentDeleteLibraryItem(item.type, item.id)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
