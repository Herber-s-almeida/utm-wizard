import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Check,
  X,
  MoreHorizontal,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  User,
} from "lucide-react";
import {
  AccessRequest,
  useApproveAccessRequest,
  useRejectAccessRequest,
} from "@/hooks/useAccessRequests";

interface AccessRequestsTableProps {
  requests: AccessRequest[];
}

export function AccessRequestsTable({ requests }: AccessRequestsTableProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [makeAdmin, setMakeAdmin] = useState(false);

  const approveRequest = useApproveAccessRequest();
  const rejectRequest = useRejectAccessRequest();

  const handleApprove = (request: AccessRequest) => {
    setSelectedRequest(request);
    setMakeAdmin(false);
    setApproveDialogOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedRequest) return;
    approveRequest.mutate(
      { requestId: selectedRequest.id, makeAdmin },
      {
        onSuccess: () => {
          setApproveDialogOpen(false);
          setSelectedRequest(null);
          setMakeAdmin(false);
        },
      }
    );
  };

  const handleReject = (request: AccessRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedRequest) return;
    rejectRequest.mutate(
      { requestId: selectedRequest.id, reason: rejectionReason || undefined },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedRequest(null);
          setRejectionReason("");
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Solicitante</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Data da Solicitação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {request.email}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {request.company_name ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {request.company_name}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-right">
                {request.status === "pending" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleApprove(request)}>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Aprovar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleReject(request)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {request.rejection_reason && (
                      <span title={request.rejection_reason}>Motivo informado</span>
                    )}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>
              Ao aprovar, um convite será enviado para{" "}
              <strong>{selectedRequest?.email}</strong> para criar conta e ambiente próprio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="makeAdmin"
                checked={makeAdmin}
                onCheckedChange={(checked) => setMakeAdmin(checked === true)}
              />
              <Label htmlFor="makeAdmin" className="text-sm font-normal">
                Tornar Administrador do Sistema
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Administradores do sistema podem gerenciar todos os ambientes e usuários.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={approveRequest.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Aprovar e Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Rejeitar a solicitação de <strong>{selectedRequest?.email}</strong>. Opcionalmente,
              informe o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Informe o motivo da rejeição..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Rejeitar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
