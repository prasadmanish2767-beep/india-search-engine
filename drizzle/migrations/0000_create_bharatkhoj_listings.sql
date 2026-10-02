CREATE TABLE public.site_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 domain text NOT NULL UNIQUE,
 url text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 category text NOT NULL,
 owner_email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_listings TO anon, authenticated;
GRANT ALL ON public.site_listings TO service_role;
ALTER TABLE public.site_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can see listed site identity" ON public.site_listings FOR SELECT TO anon, authenticated USING (true);
COMMENT ON TABLE public.site_listings IS 'Unverified, owner-submitted website listings; public search responses must never expose owner_email.';