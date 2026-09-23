/** A relation as `pg_class` names it. */
interface Relation {
  oid: number;
  relname: string;
}

/**
 * The names of the relations a result's columns come from, by OID.
 *
 * `pg` gives a column the OID of its table and no name, where the renderer
 * looks tables up by name. Each OID is asked of the catalog once per
 * connection — `null` when it names no relation any more — and a failed
 * lookup costs the columns their table, never the result.
 */
export function relationNames(
  lookup: (oids: number[]) => Promise<Relation[]>
): (tableIDs: number[]) => Promise<ReadonlyMap<number, string | null>> {
  const known = new Map<number, string | null>();

  return async (tableIDs) => {
    // 0 is a column computed by the query, which belongs to no relation
    const missing = [...new Set(tableIDs)].filter(
      (oid) => oid !== 0 && !known.has(oid)
    );

    if (missing.length === 0) {
      return known;
    }

    try {
      const found = new Map(
        (await lookup(missing)).map((relation) => [
          relation.oid,
          relation.relname,
        ])
      );

      for (const oid of missing) {
        known.set(oid, found.get(oid) ?? null);
      }
    } catch {
      // asked again with the next result
    }

    return known;
  };
}
