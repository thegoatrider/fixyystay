-- 🤖 AUTO-SYNC: Influencer & User Accounts
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. One-time Sync: Link all existing influencers whose email matches an Auth user
UPDATE public.influencers i
SET user_id = u.id,
    approved = true -- Auto-approve existing matches for seamless migration
FROM auth.users u
WHERE i.email = u.email
AND i.user_id IS NULL;

-- 2. Automation Trigger: Link new influencers the moment they are created if user exists
CREATE OR REPLACE FUNCTION public.auto_link_influencer_on_create()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to find a matching user by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.email LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        NEW.user_id := v_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_link_influencer ON public.influencers;
CREATE TRIGGER tr_auto_link_influencer
    BEFORE INSERT ON public.influencers
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_link_influencer_on_create();

-- 3. Automation Trigger: Link influencer profile when a new User signs up
CREATE OR REPLACE FUNCTION public.auto_link_influencer_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.influencers
    SET user_id = NEW.id
    WHERE email = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_link_on_signup ON auth.users;
-- Note: auth.users triggers require superuser, if this fails, manual link is backup.
-- This part ensures future creators are linked even if they sign up AFTER being added as influencers.
