-- Legacy migration previously inserted sort_order 1..21 for a 7×21 grid.
-- Custom load_slots schemas (NOT NULL driver_id, origin, mt, etc.) cannot be bulk-filled safely.
-- The schedule RPC uses the first three load_slots by sort_order (see 20260217120000); three
-- canonical rows are enough. This file is intentionally a no-op so `supabase db push` succeeds.

do $$
begin
  raise notice
    'ensure_21_load_slot_rows: skipped (legacy 21-row seed removed; keep three canonical load_slots).';
end $$;

notify pgrst, 'reload schema';
