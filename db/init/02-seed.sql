CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (id, name, description, authorization_level, status)
VALUES
  ('role-usuario', 'usuario', 'Default platform user role', 'basic', 'active'),
  ('role-mentor', 'mentor', 'Mentor role', 'elevated', 'active'),
  ('role-facilitador', 'facilitador', 'Facilitator role', 'admin', 'active'),
  ('role-proponente', 'proponente', 'Project proposer role', 'basic', 'active'),
  ('role-acreditador', 'acreditador', 'Accreditor role', 'elevated', 'active')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (
  id,
  username,
  password,
  email,
  first_name,
  last_name,
  preferred_language,
  timezone,
  status
)
VALUES (
  'impactlab-default-user',
  'impactlab',
  'impactlab',
  'impactlab@local',
  'Impact',
  'Lab',
  'es',
  'America/Mexico_City',
  'active'
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (
  id,
  user_id,
  role_id,
  context,
  is_primary,
  status
)
VALUES (
  'impactlab-default-user-role',
  'impactlab-default-user',
  'role-usuario',
  'global',
  'true',
  'active'
)
ON CONFLICT DO NOTHING;
