-- Permitir verificação de convites por email para registro
-- Isso permite que usuários não logados verifiquem se seu email tem convite pendente
CREATE POLICY "Anyone can check invites by email for registration"
ON public.pending_environment_invites
FOR SELECT
TO anon, authenticated
USING (true);