import type { TableSorting } from '../../../configuration/type';

/** The direction of a sorted column, as `order[column]=` writes it. */
enum OrderDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

const ORDER_KEY = /^order\[(.+)\]$/s;

function isOrderDirection(value: string): value is OrderDirection {
  return Object.values<string>(OrderDirection).includes(value);
}

/**
 * The query string of a table page: `?where=…&order[a]=ASC&order[b]=DESC`.
 * No sorted column is `order=`, so that the loader does not fall back to the stored order.
 */
export function tableSearch(where: string, sorting: TableSorting): string {
  const order =
    sorting.length > 0
      ? sorting.map(
          ({ id, desc }) =>
            `order[${encodeURIComponent(id)}]=${desc ? OrderDirection.Desc : OrderDirection.Asc}`
        )
      : ['order='];

  return `?${[`where=${encodeURIComponent(where)}`, ...order].join('&')}`;
}

/** The order a URL gives, in the order of its params; `null` when it gives none. */
export function readOrderParams(
  searchParams: URLSearchParams
): TableSorting | null {
  const sorting = [...searchParams].flatMap(([key, value]) => {
    const id = ORDER_KEY.exec(key)?.[1];

    return id && isOrderDirection(value)
      ? [{ id, desc: value === OrderDirection.Desc }]
      : [];
  });

  return sorting.length > 0 || searchParams.has('order') ? sorting : null;
}
