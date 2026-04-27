-- Fix mutable search_path warnings
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'buyer'::public.app_role)
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Restrict bucket listing: only authenticated users can list, but anyone can read individual files via public URL
DROP POLICY IF EXISTS "Crop images are publicly viewable" ON storage.objects;

-- Public read access (one-by-one) is achieved by the bucket being public; this policy allows
-- reading objects via API only when authenticated, preventing anonymous folder enumeration.
CREATE POLICY "Authenticated can read crop images" ON storage.objects
  FOR SELECT USING (bucket_id = 'crop-images' AND auth.role() = 'authenticated');