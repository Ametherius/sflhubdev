/** PostgREST returned no row after update (RLS, wrong id, or missing select policy). */
export function isEmptyUpdateResult(data) {
  return data == null || (Array.isArray(data) && data.length === 0);
}

export function entitySaveFailedMessage(tableLabel) {
  return `Could not save ${tableLabel}. Sign in again, or ask an admin to run the drivers/units RLS migration on Supabase.`;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {"drivers"|"units"} table
 * @param {string|number} id
 * @param {Record<string, unknown>} patch
 * @param {Record<string, unknown>} [altPatch] tried if first update errors on column names
 */
export async function updateEntityRow(supabase, table, id, patch, altPatch) {
  let result = await supabase
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("id");

  if (
    result.error &&
    altPatch &&
    /column|schema cache|does not exist|PGRST204/i.test(result.error.message ?? "")
  ) {
    result = await supabase
      .from(table)
      .update(altPatch)
      .eq("id", id)
      .select("id");
  }

  return result;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {"drivers"|"units"} table
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} [altRow]
 */
export async function insertEntityRow(supabase, table, row, altRow) {
  let result = await supabase.from(table).insert(row).select("id");

  if (
    result.error &&
    altRow &&
    /column|schema cache|does not exist|PGRST204/i.test(result.error.message ?? "")
  ) {
    result = await supabase.from(table).insert(altRow).select("id");
  }

  return result;
}

/** Insert payloads for units (camelCase vs snake_case PIN columns). */
export function buildNewUnitRows(values) {
  const row = {
    unit: values.unit,
    petro: values.petro,
    ufa: values.ufa,
    petroPIN: values.petroPIN,
    ufaPIN: values.ufaPIN,
  };
  const alt = {
    unit: values.unit,
    petro: values.petro,
    ufa: values.ufa,
    petro_pin: values.petroPIN,
    ufa_pin: values.ufaPIN,
  };
  return { row, alt };
}
