import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

interface CreateActualData {
  media_plan_id: string;
  period_start: string;
  period_end: string;
  actual_amount: number;
  source?: string;
  notes?: string;
  dimensions_json?: Record<string, any>;
}

interface UpdateActualData {
  id: string;
  actual_amount?: number;
  notes?: string;
  dimensions_json?: Record<string, any>;
}

export function useFinancialActuals(planId?: string) {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["media-plans-for-finance", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_plans")
        .select("id, name")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const { data: actuals = [], isLoading: actualsLoading } = useQuery({
    queryKey: ["financial-actuals", planId, effectiveUserId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("financial_actuals")
        .select("*")
        .eq("media_plan_id", planId)
        .eq("user_id", effectiveUserId!)
        .order("period_start");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId && !!planId,
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ["financial-forecasts", planId, effectiveUserId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("financial_forecasts")
        .select("*")
        .eq("media_plan_id", planId)
        .eq("user_id", effectiveUserId!)
        .order("period_start");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId && !!planId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateActualData) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("financial_actuals")
        .insert({
          ...data,
          user_id: effectiveUserId,
          source: data.source || "manual",
        });
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert([{
        user_id: effectiveUserId,
        entity_type: "actual",
        entity_id: data.media_plan_id,
        action: "create",
        after_json: data as any,
        reason: "Valor executado registrado manualmente",
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-actuals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Valor executado registrado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateActualData) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      const { id, ...updateData } = data;
      
      // Get current data for audit
      const { data: current } = await supabase
        .from("financial_actuals")
        .select("*")
        .eq("id", id)
        .single();
      
      const { error } = await supabase
        .from("financial_actuals")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert({
        user_id: effectiveUserId,
        entity_type: "actual",
        entity_id: id,
        action: "update",
        before_json: current,
        after_json: { ...current, ...updateData },
        reason: "Valor executado atualizado",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-actuals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Valor atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      // Get current data for audit
      const { data: current } = await supabase
        .from("financial_actuals")
        .select("*")
        .eq("id", id)
        .single();
      
      const { error } = await supabase
        .from("financial_actuals")
        .delete()
        .eq("id", id);
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert({
        user_id: effectiveUserId,
        entity_type: "actual",
        entity_id: id,
        action: "delete",
        before_json: current,
        reason: "Valor executado excluído",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-actuals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Valor excluído!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (records: CreateActualData[]) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      const batchId = crypto.randomUUID();
      
      const inserts = records.map(record => ({
        ...record,
        user_id: effectiveUserId,
        source: "import",
        import_batch_id: batchId,
      }));
      
      const { error } = await supabase
        .from("financial_actuals")
        .insert(inserts);
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert({
        user_id: effectiveUserId,
        entity_type: "actual",
        entity_id: batchId,
        action: "import",
        after_json: { count: records.length, batch_id: batchId },
        reason: `Importação de ${records.length} registro(s)`,
      });

      return { count: records.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["financial-actuals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success(`${result.count} registro(s) importado(s)!`);
    },
    onError: (error: Error) => {
      toast.error("Erro na importação: " + error.message);
    },
  });

  return { 
    actuals, 
    forecasts, 
    plans, 
    isLoading: actualsLoading,
    createActual: createMutation.mutate,
    updateActual: updateMutation.mutate,
    deleteActual: deleteMutation.mutate,
    importActuals: importMutation.mutate,
    isCreating: createMutation.isPending,
    isImporting: importMutation.isPending,
  };
}
