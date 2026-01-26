-- Fix foreign key constraint: line_details should cascade delete when media_plan is deleted
ALTER TABLE public.line_details 
DROP CONSTRAINT IF EXISTS line_details_media_plan_id_fkey;

ALTER TABLE public.line_details
ADD CONSTRAINT line_details_media_plan_id_fkey 
FOREIGN KEY (media_plan_id) 
REFERENCES public.media_plans(id) 
ON DELETE CASCADE;

-- Also ensure line_detail_items cascade delete when line_details is deleted
ALTER TABLE public.line_detail_items
DROP CONSTRAINT IF EXISTS line_detail_items_line_detail_id_fkey;

ALTER TABLE public.line_detail_items
ADD CONSTRAINT line_detail_items_line_detail_id_fkey
FOREIGN KEY (line_detail_id)
REFERENCES public.line_details(id)
ON DELETE CASCADE;

-- Ensure line_detail_line_links cascade delete when line_details is deleted
ALTER TABLE public.line_detail_line_links
DROP CONSTRAINT IF EXISTS line_detail_line_links_line_detail_id_fkey;

ALTER TABLE public.line_detail_line_links
ADD CONSTRAINT line_detail_line_links_line_detail_id_fkey
FOREIGN KEY (line_detail_id)
REFERENCES public.line_details(id)
ON DELETE CASCADE;

-- Ensure line_detail_line_links cascade delete when media_lines is deleted
ALTER TABLE public.line_detail_line_links
DROP CONSTRAINT IF EXISTS line_detail_line_links_media_line_id_fkey;

ALTER TABLE public.line_detail_line_links
ADD CONSTRAINT line_detail_line_links_media_line_id_fkey
FOREIGN KEY (media_line_id)
REFERENCES public.media_lines(id)
ON DELETE CASCADE;

-- Ensure line_detail_insertions cascade delete when line_detail_items is deleted
ALTER TABLE public.line_detail_insertions
DROP CONSTRAINT IF EXISTS line_detail_insertions_line_detail_item_id_fkey;

ALTER TABLE public.line_detail_insertions
ADD CONSTRAINT line_detail_insertions_line_detail_item_id_fkey
FOREIGN KEY (line_detail_item_id)
REFERENCES public.line_detail_items(id)
ON DELETE CASCADE;