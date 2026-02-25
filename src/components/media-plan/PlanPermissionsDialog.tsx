import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanPermissionsManagement, PlanPermissionLevel } from '@/hooks/usePlanPermissions';
import { Shield, Eye, Pencil, Ban, Minus } from 'lucide-react';

interface PlanPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
}

const PERMISSION_OPTIONS = [
  { value: 'inherit', label: 'Usar do ambiente', icon: Minus, description: 'Sem restrição' },
  { value: 'edit', label: 'Pode editar', icon: Pencil, description: 'Acesso total' },
  { value: 'view', label: 'Apenas visualizar', icon: Eye, description: 'Somente leitura' },
  { value: 'none', label: 'Sem acesso', icon: Ban, description: 'Bloqueado' },
];

function getPermissionBadge(permission: PlanPermissionLevel) {
  switch (permission) {
    case 'edit':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
          <Pencil className="h-3 w-3 mr-1" />
          Editar
        </Badge>
      );
    case 'view':
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Eye className="h-3 w-3 mr-1" />
          Visualizar
        </Badge>
      );
    case 'none':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400">
          <Ban className="h-3 w-3 mr-1" />
          Sem acesso
        </Badge>
      );
  }
}

export function PlanPermissionsDialog({
  open,
  onOpenChange,
  planId,
  planName,
}: PlanPermissionsDialogProps) {
  const {
    membersWithPermissions,
    isLoading,
    setRestriction,
    isUpdating,
  } = usePlanPermissionsManagement(planId);

  const handlePermissionChange = (userId: string, value: string) => {
    if (value === 'inherit') {
      setRestriction({ userId, permissionLevel: null });
    } else {
      setRestriction({ userId, permissionLevel: value as PlanPermissionLevel });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Acessos
          </DialogTitle>
          <DialogDescription>
            Defina restrições de acesso específicas para o plano "{planName}".
            As restrições só podem limitar (nunca expandir) as permissões do ambiente.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : membersWithPermissions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum membro encontrado no ambiente.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Permissão do Ambiente</TableHead>
                <TableHead>Restrição no Plano</TableHead>
                <TableHead>Acesso Efetivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithPermissions.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {member.full_name || 'Sem nome'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPermissionBadge(member.env_permission)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.plan_restriction || 'inherit'}
                      onValueChange={(value) => handlePermissionChange(member.user_id, value)}
                      disabled={isUpdating || member.env_permission === 'none'}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMISSION_OPTIONS.map((option) => {
                          // Não permitir expandir além da permissão do ambiente
                          const disabled = 
                            (option.value === 'edit' && member.env_permission !== 'edit') ||
                            (member.env_permission === 'none' && option.value !== 'none' && option.value !== 'inherit');
                          
                          return (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              disabled={disabled}
                            >
                              <div className="flex items-center gap-2">
                                <option.icon className="h-3 w-3" />
                                {option.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {getPermissionBadge(member.effective_permission)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
          <p className="font-medium mb-1">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Usar do ambiente</strong>: Não aplica restrição, usa a permissão definida nas configurações do ambiente.</li>
            <li><strong>Pode editar</strong>: Permite edição (só funciona se o ambiente também permitir).</li>
            <li><strong>Apenas visualizar</strong>: Restringe para somente leitura neste plano.</li>
            <li><strong>Sem acesso</strong>: Bloqueia completamente o acesso a este plano.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
