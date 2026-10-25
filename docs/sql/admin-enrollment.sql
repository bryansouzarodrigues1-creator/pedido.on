-- Schema-only: runtime enrollment values are configured privately, never committed.
CREATE SCHEMA IF NOT EXISTS pizzaria_private;
REVOKE ALL ON SCHEMA pizzaria_private FROM PUBLIC, anon, authenticated;
CREATE TABLE pizzaria_private.admin_enrollment (
 id text PRIMARY KEY CHECK(id='primary'),
 email text NOT NULL,
 token_hash text NOT NULL CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 authority text NOT NULL CHECK(authority ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 used_by uuid,
 used_at timestamptz
);
ALTER TABLE pizzaria_private.admin_enrollment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pizzaria_private.admin_enrollment FROM PUBLIC, anon, authenticated;
CREATE FUNCTION pizzaria_private.claim_admin_invite(p_id uuid,p_email text,p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE claimed text;
BEGIN
 IF p_id IS NULL OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'Invalid administrator enrollment';
 END IF;
 UPDATE pizzaria_private.admin_enrollment SET used_by=p_id,used_at=clock_timestamp()
 WHERE id='primary' AND lower(btrim(email))=lower(btrim(p_email))
 AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
 AND expires_at>clock_timestamp() AND used_at IS NULL
 RETURNING authority INTO claimed;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid administrator enrollment'; END IF;
 RETURN claimed;
END;
$function$;
REVOKE ALL ON FUNCTION pizzaria_private.claim_admin_invite(uuid,text,text) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION pizzaria_private.enroll_platform_administrator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE token text; claimed text;
BEGIN
 token:=NEW.raw_user_meta_data->>'pizzaria_admin_invite';
 IF token IS NOT NULL THEN
  NEW.raw_user_meta_data:=NEW.raw_user_meta_data-'pizzaria_admin_invite';
  claimed:=pizzaria_private.claim_admin_invite(NEW.id,NEW.email,token);
  NEW.raw_app_meta_data:=coalesce(NEW.raw_app_meta_data,'{}'::jsonb)
   ||jsonb_build_object('pizzaria_admin_authority',claimed);
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION pizzaria_private.enroll_platform_administrator() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pizzaria_admin_enrollment BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION pizzaria_private.enroll_platform_administrator();
CREATE FUNCTION pizzaria_private.scrub_identity_invite()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $function$
BEGIN
 NEW.identity_data:=NEW.identity_data-'pizzaria_admin_invite';
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION pizzaria_private.scrub_identity_invite() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pizzaria_scrub_identity_invite BEFORE INSERT OR UPDATE ON auth.identities
FOR EACH ROW EXECUTE FUNCTION pizzaria_private.scrub_identity_invite();
CREATE FUNCTION pizzaria_private.scrub_user_invite()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $function$
BEGIN
 NEW.raw_user_meta_data:=NEW.raw_user_meta_data-'pizzaria_admin_invite';
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION pizzaria_private.scrub_user_invite() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pizzaria_scrub_user_invite BEFORE UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION pizzaria_private.scrub_user_invite();
