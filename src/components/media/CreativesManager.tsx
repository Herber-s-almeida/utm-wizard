import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, FileType, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaCreative } from '@/types/media';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFormats } from '@/hooks/useFormatsHierarchy';
import { FormatWizardDialog } from '@/components/config/FormatWizardDialog';

interface CreativesManagerProps {
  mediaLineId: string;
  userId: string;
  creatives: MediaCreative[];
  onUpdate: () => void;
}

type CreativeStep = 'idle' | 'select-format' | 'fill-details';

interface CreativeForm {
  format_id: string | null;
  message: string;
  notes: string;
}

export function CreativesManager({ mediaLineId, userId, creatives, onUpdate }: CreativesManagerProps) {
  const [step, setStep] = useState<CreativeStep>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFormatWizard, setShowFormatWizard] = useState(false);
  const [form, setForm] = useState<CreativeForm>({
    format_id: null,
    message: '',
    notes: '',
  });

  const formats = useFormats();

  const resetForm = () => {
    setForm({ format_id: null, message: '', notes: '' });
    setStep('idle');
    setEditingId(null);
  };

  const handleSelectFormat = (formatId: string) => {
    setForm({ ...form, format_id: formatId });
    setStep('fill-details');
  };

  const handleFormatCreated = () => {
    formats.refetch();
  };

  const handleSave = async () => {
    if (!form.format_id) {
      toast.error('Selecione um formato');
      return;
    }

    try {
      const selectedFormat = formats.data?.find(f => f.id === form.format_id);
      const creativeName = selectedFormat?.name || 'Criativo';

      if (editingId) {
        const { error } = await supabase
          .from('media_creatives')
          .update({
            format_id: form.format_id,
            name: creativeName,
            copy_text: form.message || null,
            notes: form.notes || null,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Criativo atualizado!');
      } else {
        const { error } = await supabase
          .from('media_creatives')
          .insert({
            media_line_id: mediaLineId,
            user_id: userId,
            format_id: form.format_id,
            name: creativeName,
            copy_text: form.message || null,
            notes: form.notes || null,
          });

        if (error) throw error;
        toast.success('Criativo adicionado!');
      }

      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Error saving creative:', error);
      toast.error('Erro ao salvar criativo');
    }
  };

  const handleEdit = (creative: MediaCreative) => {
    setForm({
      format_id: (creative as any).format_id || null,
      message: creative.copy_text || '',
      notes: creative.notes || '',
    });
    setEditingId(creative.id);
    setStep((creative as any).format_id ? 'fill-details' : 'select-format');
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('media_creatives')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Criativo excluído');
      onUpdate();
    } catch (error) {
      console.error('Error deleting creative:', error);
      toast.error('Erro ao excluir criativo');
    }
  };

  const getFormatName = (formatId: string | null) => {
    if (!formatId) return null;
    return formats.data?.find(f => f.id === formatId)?.name;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Criativos</label>
        {step === 'idle' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStep('select-format')}
            className="gap-1 h-7 text-xs"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {/* List existing creatives */}
        {creatives.map((creative) => {
          const formatName = getFormatName((creative as any).format_id);
          return (
            <motion.div
              key={creative.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
            >
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <FileType className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {formatName || creative.name}
                </div>
                {creative.copy_text && (
                  <div className="text-xs text-muted-foreground truncate">{creative.copy_text}</div>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleEdit(creative)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(creative.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {/* Step 1: Select Format */}
        {step === 'select-format' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-lg p-4 space-y-4 bg-card"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
              <span>Selecione um formato</span>
            </div>

            <div className="space-y-3">
              <Select
                value={form.format_id || ''}
                onValueChange={handleSelectFormat}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um formato existente..." />
                </SelectTrigger>
                <SelectContent>
                  {formats.data?.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>ou</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowFormatWizard(true)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Criar novo formato
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Fill Details */}
        {step === 'fill-details' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-lg p-4 space-y-4 bg-card"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
              <span>Detalhes do criativo</span>
            </div>

            {/* Selected format display */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <FileType className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{getFormatName(form.format_id)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 ml-auto text-xs"
                onClick={() => setStep('select-format')}
              >
                Alterar
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="creative-message">Mensagem</Label>
                <Textarea
                  id="creative-message"
                  placeholder="Mensagem / copy do criativo..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="creative-notes">Observações</Label>
                <Textarea
                  id="creative-notes"
                  placeholder="Observações adicionais (opcional)..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSave}>
                <Check className="w-4 h-4 mr-1" />
                {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {creatives.length === 0 && step === 'idle' && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhum criativo adicionado
        </div>
      )}

      {/* Format Wizard Dialog */}
      <FormatWizardDialog
        open={showFormatWizard}
        onOpenChange={setShowFormatWizard}
        onComplete={handleFormatCreated}
      />
    </div>
  );
}
