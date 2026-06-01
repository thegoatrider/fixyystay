-- Add attachment_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Setup storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message_attachments', 'message_attachments', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Setup policies for message_attachments bucket
-- Allow public read access to attachments
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'message_attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'message_attachments');

-- Allow users to update their own uploads (if necessary)
CREATE POLICY "Authenticated Update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'message_attachments');
