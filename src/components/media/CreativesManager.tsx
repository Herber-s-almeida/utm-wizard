import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Image, Video, Type, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaCreative, CREATIVE_TYPES } from '@/types/media';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreativesManagerProps {
  mediaLineId: string;
  userId: string;
  creatives: MediaCreative[];
  onUpdate: () => void;
}

export function CreativesManager({ mediaLineId, userId, creatives, onUpdate }: CreativesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    copy_text: '',
    creative_type: 'Imagem',
    notes: '',
  });

  const resetForm = () => {
    setForm({ name: '', copy_text: '', creative_type: 'Imagem', notes: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome do criativo é obrigatório');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('media_creatives')
          .update({
            name: form.name,
            copy_text: form.copy_text || null,
            creative_type: form.creative_type,
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
            name: form.name,
            copy_text: form.copy_text || null,
            creative_type: form.creative_type,
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
      name: creative.name,
      copy_text: creative.copy_text || '',
      creative_type: creative.creative_type,
      notes: creative.notes || '',
    });
    setEditingId(creative.id);
    setIsAdding(true);
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

  const getCreativeIcon = (type: string) => {
    if (type.includes('Vídeo') || type.includes('Video')) return Video;
    if (type.includes('Texto')) return Type;
    return Image;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Criativos</label>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1 h-7 text-xs"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {creatives.map((creative) => {
          const Icon = getCreativeIcon(creative.creative_type);
          return (
            <motion.div
              key={creative.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
            >
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{creative.name}</div>
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

        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-lg p-4 space-y-3 bg-card"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Nome do criativo *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Select
                value={form.creative_type}
                onValueChange={(value) => setForm({ ...form, creative_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATIVE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Copy / texto do anúncio"
              value={form.copy_text}
              onChange={(e) => setForm({ ...form, copy_text: e.target.value })}
              rows={2}
            />
            <Input
              placeholder="Notas (opcional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
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

      {creatives.length === 0 && !isAdding && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhum criativo adicionado
        </div>
      )}
    </div>
  );
}