select json_agg(
  json_build_object(
    'version', version,
    'name', name,
    'statements', statements
  )
  order by version
) as migrations
from supabase_migrations.schema_migrations;