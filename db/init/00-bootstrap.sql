\set ON_ERROR_STOP on

SELECT format(
  'CREATE ROLE %I WITH LOGIN PASSWORD %L',
  :'app_db_user',
  :'app_db_password'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = :'app_db_user'
)\gexec

SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L',
  :'app_db_user',
  :'app_db_password'
)\gexec

SELECT format(
  'CREATE DATABASE %I OWNER %I',
  :'app_db_name',
  :'app_db_user'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_database
  WHERE datname = :'app_db_name'
)\gexec

SELECT format(
  'GRANT ALL PRIVILEGES ON DATABASE %I TO %I',
  :'app_db_name',
  :'app_db_user'
)\gexec
