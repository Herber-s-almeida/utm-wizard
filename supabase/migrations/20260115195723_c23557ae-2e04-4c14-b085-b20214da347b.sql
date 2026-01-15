-- Add invite_token column to pending_environment_invites
ALTER TABLE public.pending_environment_invites 
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_invites_token ON public.pending_environment_invites(invite_token);

-- Update existing rows with tokens (if any)
UPDATE public.pending_environment_invites 
SET invite_token = encode(gen_random_bytes(32), 'hex')
WHERE invite_token IS NULL;