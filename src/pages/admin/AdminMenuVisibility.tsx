import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useMenuVisibility } from '@/hooks/useMenuVisibility';
import { toast } from 'sonner';
import { Eye, EyeOff, FileText, FolderOpen, BarChart3 } from 'lucide-react';

const menuItems = [
  {
    key: 'taxonomy',
    label: 'Taxonomia',
    description: 'Página de taxonomia e UTMs',
    icon: FileText,
  },
  {
    key: 'media_resources',
    label: 'Recursos de Mídia',
    description: 'Biblioteca de recursos de mídia',
    icon: FolderOpen,
  },
  {
    key: 'reports',
    label: 'Relatórios',
    description: 'Página de relatórios e análises',
    icon: BarChart3,
  },
];

export default function AdminMenuVisibility() {
  const { settings, updateSetting, getSettingByKey } = useMenuVisibility();

  const handleToggle = async (menuKey: string, currentValue: boolean) => {
    try {
      await updateSetting.mutateAsync({ menuKey, isHidden: !currentValue });
      toast.success(`Menu ${!currentValue ? 'ocultado' : 'visível'} para usuários`);
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visibilidade do Menu</h1>
          <p className="text-muted-foreground">
            Configure quais itens do menu ficam ocultos para usuários não-administradores
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5" />
              Itens do Menu
            </CardTitle>
            <CardDescription>
              Itens marcados como ocultos não aparecerão no menu para usuários comuns. 
              Administradores sempre verão todos os itens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {menuItems.map((item) => {
              const setting = getSettingByKey(item.key);
              const isHidden = setting?.is_hidden ?? false;
              
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <Label htmlFor={item.key} className="text-base font-medium">
                        {item.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {isHidden ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Oculto
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Visível
                        </>
                      )}
                    </span>
                    <Switch
                      id={item.key}
                      checked={isHidden}
                      onCheckedChange={() => handleToggle(item.key, isHidden)}
                      disabled={updateSetting.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Nota sobre visibilidade</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Como administrador, você sempre verá todos os itens do menu, 
                  independentemente das configurações de visibilidade. 
                  As configurações afetam apenas usuários sem privilégios de administrador.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
