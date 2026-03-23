-- Add commission_rate and approved status to influencers
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('earning', 'payout')),
    booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet transactions"
    ON wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet transactions"
    ON wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.email = 'superadmin@fixstay.com'
        )
    );

-- Create payout_requests table
CREATE TABLE IF NOT EXISTS payout_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    bank_details text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for payout_requests
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payout requests"
    ON payout_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout requests"
    ON payout_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payout requests"
    ON payout_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.email = 'superadmin@fixstay.com'
        )
    );
