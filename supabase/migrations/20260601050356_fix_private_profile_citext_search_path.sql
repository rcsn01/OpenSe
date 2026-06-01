-- accounts_update_profile casts usernames with an unqualified CITEXT type.
-- citext now lives in extensions, so keep the private implementation's
-- existing public lookup path and add extensions for that cast.
ALTER FUNCTION app_private.accounts_update_profile(TEXT, TEXT, TEXT, TEXT)
SET search_path = public, extensions;
