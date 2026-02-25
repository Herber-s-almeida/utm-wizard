import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { downloadImportTemplate } from '@/utils/importPlanTemplate';
import { cn } from '@/lib/utils';

interface ImportFileUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
}

export function ImportFileUpload({ onFileSelect, file }: ImportFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidType && !hasValidExtension) {
      setError('Formato inválido. Use arquivos .xlsx, .xls ou .csv');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Upload do Arquivo</h2>
        <p className="text-muted-foreground text-sm">
          Faça upload de um arquivo CSV ou Excel com os dados do plano de mídia
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          file && "border-success bg-success/5"
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {file ? (
          <div className="space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
            <div>
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique para selecionar outro arquivo
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className={cn(
              "w-12 h-12 mx-auto transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
            <div>
              <p className="font-medium text-foreground">
                Arraste um arquivo aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Formatos aceitos: .xlsx, .xls, .csv (máx. 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Template Download */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Modelo de exemplo</p>
                <p className="text-xs text-muted-foreground">
                  Baixe o modelo com todas as colunas e instruções
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                downloadImportTemplate();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar modelo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
        <p className="font-medium">Informações importantes:</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Colunas obrigatórias: Código da linha, Veículo, Canal, Orçamento</li>
          <li>Colunas opcionais: Subdivisão, Momento, Fase do Funil, Datas, etc.</li>
          <li>Colunas de meses (jan_2026, fev_2026...) serão detectadas automaticamente</li>
          <li>Entidades não encontradas poderão ser criadas no próximo passo</li>
        </ul>
      </div>
    </div>
  );
}
