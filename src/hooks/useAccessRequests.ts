import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AccessRequest {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
}

async function callAdminOperation(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-operations", {
    body: { action, payload },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}

export function useAccessRequests() {
  return useQuery({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const result = await callAdminOperation("list_access_requests");
      return result.requests as AccessRequest[];
    },
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, makeAdmin }: { requestId: string; makeAdmin?: boolean }) => {
      return callAdminOperation("approve_access_request", { requestId, makeAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Solicitação aprovada! Email de convite enviado.");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar solicitação: ${error.message}`);
    },
  });
}

export function useRejectAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      return callAdminOperation("reject_access_request", { requestId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      toast.success("Solicitação rejeitada.");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar solicitação: ${error.message}`);
    },
  });
}

export function useCreateAccessRequest() {
  return useMutation({
    mutationFn: async ({
      email,
      fullName,
      companyName,
    }: {
      email: string;
      fullName: string;
      companyName?: string;
    }) => {
      // Insert directly - RLS allows anyone to insert
      const { data, error } = await supabase
        .from("system_access_requests")
        .insert({
          email: email.toLowerCase(),
          full_name: fullName,
          company_name: companyName || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Já existe uma solicitação pendente para este email.");
        }
        throw error;
      }
      return data;
    },
  });
}
