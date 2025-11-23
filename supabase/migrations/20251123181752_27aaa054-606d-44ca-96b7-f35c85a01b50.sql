-- Add logo_url column to marketplaces table
ALTER TABLE public.marketplaces 
ADD COLUMN logo_url TEXT;

-- Create storage bucket for marketplace logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-logos', 'marketplace-logos', true);

-- Create RLS policies for marketplace logos bucket
CREATE POLICY "Anyone can view marketplace logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketplace-logos');

CREATE POLICY "Admins can upload marketplace logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketplace-logos' 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Admins can update marketplace logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketplace-logos' 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Admins can delete marketplace logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace-logos' 
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);