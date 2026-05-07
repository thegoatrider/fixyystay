-- 🤖 AUTO-SYNC: Owner & User Accounts
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. One-time Sync: Link all existing owners whose email matches an Auth user
UPDATE public.owners o
SET user_id = u.id
FROM auth.users u
WHERE o.email = u.email
AND o.user_id IS NULL;

-- 2. Automation Trigger: Link new owners the moment they are created if user exists
CREATE OR REPLACE FUNCTION public.auto_link_owner_on_create()
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

DROP TRIGGER IF EXISTS tr_auto_link_owner ON public.owners;
CREATE TRIGGER tr_auto_link_owner
    BEFORE INSERT ON public.owners
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_link_owner_on_create();

-- 3. Automation Trigger: Link owner profile when a new User signs up
CREATE OR REPLACE FUNCTION public.auto_link_owner_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.owners
    SET user_id = NEW.id
    WHERE email = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_link_owner_on_signup ON auth.users;
-- Note: auth.users triggers require superuser privileges.
-- If this fails in your environment, use manual sync or one-time sync above.
CREATE TRIGGER tr_auto_link_owner_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_link_owner_on_signup();
