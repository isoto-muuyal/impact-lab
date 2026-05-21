\set ON_ERROR_STOP on

SELECT format('ALTER SCHEMA public OWNER TO %I', :'app_db_user')\gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'app_db_user')\gexec

SELECT format('ALTER TABLE public.%I OWNER TO %I', tablename, :'app_db_user')
FROM pg_tables
WHERE schemaname = 'public'\gexec

SELECT format('ALTER SEQUENCE public.%I OWNER TO %I', sequencename, :'app_db_user')
FROM pg_sequences
WHERE schemaname = 'public'\gexec

SELECT format('ALTER VIEW public.%I OWNER TO %I', viewname, :'app_db_user')
FROM pg_views
WHERE schemaname = 'public'\gexec

SELECT format('ALTER MATERIALIZED VIEW public.%I OWNER TO %I', matviewname, :'app_db_user')
FROM pg_matviews
WHERE schemaname = 'public'\gexec

SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO %I', :'app_db_user')\gexec
SELECT format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_db_user')\gexec
SELECT format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO %I', :'app_db_user')\gexec

SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO %I', :'app_db_user')\gexec
SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I', :'app_db_user')\gexec
SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I', :'app_db_user')\gexec
