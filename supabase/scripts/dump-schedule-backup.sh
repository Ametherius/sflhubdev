#!/usr/bin/env bash
# Daily copy of the dispatch tables, stored outside the live database.
# The dump includes driver passwords and fuel PINs. Keep the file private.
#
# Uses the direct Postgres connection (port 5432), not the pooler.
#   DATABASE_URL='postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres' \
#     bash supabase/scripts/dump-schedule-backup.sh
#
# Supabase Dashboard → Database → Backups is the separate full-database copy.
# Schedule this script daily (Windows Task Scheduler) so a single week can be
# pulled back with pg_restore without rolling the whole project back.

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required. Use the direct database URI from Supabase, port 5432." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump was not found. Install the PostgreSQL client tools and run this again." >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/../.." && pwd)"
out_dir="$root/backups"
mkdir -p "$out_dir"

stamp="$(date +%Y%m%d-%H%M%S)"
out="$out_dir/schedule-$stamp.dump"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --data-only \
  --no-owner \
  --no-privileges \
  --table=public.schedule_weeks \
  --table=public.schedule_assignments \
  --table=public.schedule_loads \
  --table=public.schedule_week_unit_exclusions \
  --table=public.in_use_units \
  --table=public.drivers \
  --table=public.units \
  --table=public.load_slots \
  --table=public.loadsheets \
  --file="$out"

echo "Wrote $out"
