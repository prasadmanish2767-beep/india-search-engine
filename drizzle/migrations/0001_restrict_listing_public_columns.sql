REVOKE SELECT ON public.site_listings FROM anon, authenticated;
GRANT SELECT (domain, url, title, description, category, created_at) ON public.site_listings TO anon, authenticated;