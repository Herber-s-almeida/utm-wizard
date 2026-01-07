import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { useVehicles, useChannels, useMediums, Medium } from '@/hooks/useConfigData';
import { VehicleDialog } from '@/components/config/VehicleDialog';
import { ChannelDialog } from '@/components/config/ChannelDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function VehiclesPage() {
  const {
    activeItems: activeVehicles,
    data: allVehicles,
    create: createVehicle,
    update: updateVehicle,
    remove: removeVehicle,
  } = useVehicles();

  const {
    activeItems: activeChannels,
    data: allChannels,
    create: createChannel,
    update: updateChannel,
    remove: removeChannel,
  } = useChannels();

  const { activeItems: activeMediums, data: allMediums, create: createMedium } = useMediums();
  
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<{ type: 'vehicle' | 'channel'; id: string } | null>(null);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const getVehicleChannels = (vehicleId: string) => activeChannels?.filter(c => c.vehicle_id === vehicleId) || [];
  const existingVehicleNames = activeVehicles?.map(v => v.name) || [];

  const handleCreateVehicle = (data: { name: string; description: string; medium_id: string; channels: { name: string; description: string }[] }) => {
    createVehicle.mutate({ name: data.name, description: data.description, medium_id: data.medium_id }, {
      onSuccess: (newVehicle: any) => {
        data.channels.forEach(ch => {
          createChannel.mutate({ name: ch.name, description: ch.description, vehicle_id: newVehicle.id });
        });
      }
    });
  };

  const handleUpdateVehicle = (data: { name: string; description: string; medium_id: string; channels: { name: string; description: string }[] }) => {
    if (!editingVehicle) return;
    updateVehicle.mutate({ id: editingVehicle.id, name: data.name, description: data.description });
  };

  const handleCreateMedium = async (data: { name: string; description: string }): Promise<Medium | undefined> => {
    return new Promise((resolve) => {
      createMedium.mutate(data, {
        onSuccess: (newMedium) => resolve(newMedium as Medium),
        onError: () => resolve(undefined)
      });
    });
  };

  const handleCreateChannel = (data: { name: string; description?: string; slug?: string; vehicle_id: string }) => {
    createChannel.mutate({ name: data.name, description: data.description, slug: data.slug, vehicle_id: data.vehicle_id });
  };

  const getSelectedVehicle = () => {
    if (editingChannel) {
      return activeVehicles?.find(v => v.id === editingChannel.vehicle_id);
    }
    return activeVehicles?.find(v => v.id === selectedVehicleId);
  };

  const getChannelExistingNames = () => {
    const vehicleId = editingChannel?.vehicle_id || selectedVehicleId;
    if (!vehicleId) return [];
    return getVehicleChannels(vehicleId).map(c => c.name);
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getMediumName = (mediumId: string | null) => {
    if (!mediumId) return null;
    return allMediums?.find(m => m.id === mediumId)?.name;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/media-plans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Veículos e Canais</h1>
            <p className="text-muted-foreground">Gerencie os veículos e seus canais de comunicação</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo veículo
          </Button>
        </div>

        <div className="space-y-3">
          {activeVehicles?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum veículo criado ainda
              </CardContent>
            </Card>
          ) : (
            activeVehicles?.map(vehicle => {
              const vehicleChannels = getVehicleChannels(vehicle.id);
              const mediumName = getMediumName(vehicle.medium_id);
              return (
                <Card key={vehicle.id}>
                  <Collapsible open={openItems[vehicle.id]} onOpenChange={() => toggleItem(vehicle.id)}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {openItems[vehicle.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{vehicle.name}</CardTitle>
                              {mediumName && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">{mediumName}</span>
                              )}
                            </div>
                            {(vehicle as any).description && (
                              <p className="text-sm text-muted-foreground">{(vehicle as any).description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingVehicle(vehicle); setVehicleDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId({ type: 'vehicle', id: vehicle.id })} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3">
                        <div className="pl-8 space-y-2">
                          {vehicleChannels.map(channel => (
                            <div key={channel.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                              <div>
                                <span className="text-sm">{channel.name}</span>
                                {(channel as any).description && (
                                  <p className="text-xs text-muted-foreground">{(channel as any).description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingChannel(channel); setChannelDialogOpen(true); }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId({ type: 'channel', id: channel.id })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => { setSelectedVehicleId(vehicle.id); setEditingChannel(null); setChannelDialogOpen(true); }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Criar novo canal no veículo
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </div>

        <VehicleDialog
          open={vehicleDialogOpen}
          onOpenChange={setVehicleDialogOpen}
          onSave={editingVehicle ? handleUpdateVehicle : handleCreateVehicle}
          existingNames={existingVehicleNames}
          initialData={editingVehicle ? {
            name: editingVehicle.name,
            description: editingVehicle.description || '',
            medium_id: editingVehicle.medium_id || '',
            channels: getVehicleChannels(editingVehicle.id).map(c => ({ name: c.name, description: (c as any).description || '' }))
          } : undefined}
          mode={editingVehicle ? 'edit' : 'create'}
          mediums={activeMediums || []}
          onCreateMedium={handleCreateMedium}
        />

        <ChannelDialog
          open={channelDialogOpen}
          onOpenChange={(open) => { setChannelDialogOpen(open); if (!open) setEditingChannel(null); }}
          onSave={handleCreateChannel}
          onUpdate={(data) => { updateChannel.mutate(data); setEditingChannel(null); }}
          editingChannel={editingChannel}
          vehicleId={editingChannel?.vehicle_id || selectedVehicleId || ''}
          vehicleName={getSelectedVehicle()?.name || ''}
          vehicleSlug={getSelectedVehicle()?.slug || ''}
          existingNames={getChannelExistingNames()}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {deleteId?.type === 'vehicle' ? 'veículo' : 'canal'}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se estiver vinculado a algum plano, a exclusão falhará.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId?.type === 'vehicle') removeVehicle.mutate(deleteId.id);
                  else if (deleteId?.type === 'channel') removeChannel.mutate(deleteId.id);
                  setDeleteId(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
