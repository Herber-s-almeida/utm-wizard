import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CreativeTypeSimpleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  existingNames: string[];
  initialData?: { id: string; name: string };
  mode: 'create' | 'edit';
}

export function CreativeTypeSimpleDialog({
  open,
  onOpenChange,
  onSave,
  existingNames,
  initialData,
  mode,
}: CreativeTypeSimpleDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
    }
  }, [open, initialData]);

  const nameExists = existingNames.some(
    n => n.toLowerCase().trim() === name.toLowerCase().trim() && 
    (mode === 'create' || n.toLowerCase() !== initialData?.name.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || nameExists) return;
    onSave(name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Tipo de Criativo' : 'Editar Tipo de Criativo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Imagem Estática, Vídeo, Áudio, Motion"
                className={cn(nameExists && 'border-destructive')}
                autoFocus
              />
              {nameExists && (
                <p className="text-xs text-destructive">Já existe um tipo de criativo com este nome</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tipos de criativo definem a natureza do conteúdo (ex: imagem estática, vídeo, áudio).
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || nameExists}>
              {mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
