-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('police', 'owner')),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Police can read and write all messages
CREATE POLICY "Police can view all messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'police'
        )
    );

CREATE POLICY "Police can insert messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'police'
        )
        AND sender_type = 'police'
    );

CREATE POLICY "Police can update messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'police'
        )
    );

-- Owners can only read and write their own messages
CREATE POLICY "Owners can view their own messages" ON messages
    FOR SELECT USING (
        auth.uid() = owner_id
    );

CREATE POLICY "Owners can insert their own messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id
        AND sender_type = 'owner'
    );

CREATE POLICY "Owners can update their own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = owner_id
    );

-- Enable Realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
