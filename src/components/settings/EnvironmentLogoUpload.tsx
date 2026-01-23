import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageCropDialog } from './ImageCropDialog';

interface EnvironmentLogoUploadProps {
  currentLogoUrl?: string | null;
  environmentId: string;
  onUploadComplete: (url: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function EnvironmentLogoUpload({
  currentLogoUrl,
  environmentId,
  onUploadComplete,
  disabled = false,
}: EnvironmentLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato de arquivo inválido. Use JPG, PNG ou WebP.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. O tamanho máximo é 20MB.');
      return;
    }

    // Create a preview URL for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);

    try {
      // Create a unique file name
      const fileName = `${environmentId}/logo-${Date.now()}.jpg`;

      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/environment-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('environment-logos').remove([oldPath]);
        }
      }

      // Upload cropped logo
      const { data, error: uploadError } = await supabase.storage
        .from('environment-logos')
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('environment-logos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
      toast.success('Logo carregado com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao carregar logo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
      setSelectedImageSrc(null);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    setIsUploading(true);

    try {
      const path = currentLogoUrl.split('/environment-logos/')[1];
      if (path) {
        const { error } = await supabase.storage.from('environment-logos').remove([path]);
        if (error) throw error;
      }

      setPreviewUrl(null);
      onUploadComplete(null);
      toast.success('Logo removido com sucesso!');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Erro ao remover logo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Logo Preview */}
        <Avatar className="h-20 w-20 border-2 border-border">
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt="Logo do ambiente" className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>

        {/* Upload Controls */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crop className="h-4 w-4" />
            )}
            {previewUrl ? 'Trocar Logo' : 'Carregar Logo'}
          </Button>

          {previewUrl && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedImageSrc(previewUrl);
                  setCropDialogOpen(true);
                }}
                disabled={disabled || isUploading}
              >
                <Crop className="h-4 w-4" />
                Editar Crop
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={disabled || isUploading}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Remover
              </Button>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WebP. Máx 20MB.
          </p>
        </div>
      </div>

      {/* Crop Dialog */}
      {selectedImageSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open) setSelectedImageSrc(null);
          }}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}