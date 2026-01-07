import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, FileJson, HelpCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  LibraryConfigExport,
  exportLibraryToJson,
  exportLibraryToExcel,
  parseLibraryFromJson,
  parseLibraryFromExcel,
  generateImportTemplate,
} from '@/utils/libraryExport';

interface LibraryImportExportDialogProps {
  currentConfig: LibraryConfigExport;
  onImport: (config: LibraryConfigExport) => Promise<void>;
  trigger?: React.ReactNode;
}

export function LibraryImportExportDialog({
  currentConfig,
  onImport,
  trigger,
}: LibraryImportExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    const jsonContent = exportLibraryToJson(currentConfig);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `configuracoes_biblioteca_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Configurações exportadas em JSON');
  };

  const handleExportExcel = () => {
    exportLibraryToExcel(currentConfig);
    toast.success('Configurações exportadas em Excel');
  };

  const handleDownloadTemplate = () => {
    generateImportTemplate();
    toast.success('Template baixado');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      let parsedConfig: LibraryConfigExport | null = null;

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        parsedConfig = parseLibraryFromJson(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        parsedConfig = parseLibraryFromExcel(buffer);
      } else {
        toast.error('Formato de arquivo não suportado. Use JSON ou Excel.');
        return;
      }

      if (!parsedConfig) {
        toast.error('Erro ao processar arquivo. Verifique o formato.');
        return;
      }

      // Count items to import
      const totalItems = 
        parsedConfig.subdivisions.length +
        parsedConfig.moments.length +
        parsedConfig.funnelStages.length +
        parsedConfig.mediums.length +
        parsedConfig.vehicles.length +
        parsedConfig.channels.length +
        parsedConfig.targets.length +
        parsedConfig.statuses.length;

      if (totalItems === 0) {
        toast.warning('O arquivo não contém itens para importar.');
        return;
      }

      await onImport(parsedConfig);
      toast.success(`${totalItems} itens importados com sucesso!`);
      setOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar configurações');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const configSummary = [
    { label: 'Subdivisões', count: currentConfig.subdivisions.length },
    { label: 'Momentos', count: currentConfig.moments.length },
    { label: 'Fases do Funil', count: currentConfig.funnelStages.length },
    { label: 'Meios', count: currentConfig.mediums.length },
    { label: 'Veículos', count: currentConfig.vehicles.length },
    { label: 'Canais', count: currentConfig.channels.length },
    { label: 'Segmentações', count: currentConfig.targets.length },
    { label: 'Status', count: currentConfig.statuses.length },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Importar/Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar/Exportar Biblioteca</DialogTitle>
          <DialogDescription>
            Exporte suas configurações para backup ou importe de outro ambiente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Importar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações atuais</CardTitle>
                <CardDescription>
                  Itens que serão incluídos na exportação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {configSummary.map(item => (
                    <div key={item.label} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleExportExcel} className="flex-1 gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>
              <Button onClick={handleExportJson} variant="outline" className="flex-1 gap-2">
                <FileJson className="w-4 h-4" />
                Exportar JSON
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Importar configurações</CardTitle>
                <CardDescription>
                  Selecione um arquivo JSON ou Excel com as configurações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {importing ? (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {importing ? 'Importando...' : 'Clique para selecionar arquivo'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Formatos aceitos: .json, .xlsx
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                  <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Itens com nomes duplicados serão ignorados. Novas entradas serão adicionadas à biblioteca existente.
                  </span>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleDownloadTemplate} 
              variant="outline" 
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar Template de Importação
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
