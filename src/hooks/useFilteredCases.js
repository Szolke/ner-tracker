import { useMemo } from 'react';

/**
 * Ügyek szűrése keresőszó + státusz + kategória + max összeg alapján.
 * A keresés title + involved_persons.name + description + tags[] mezőkben keres.
 * (Korábban csak title+persons+description; a tags hozzáadásával olyan kulcsszavak
 * is megtalálhatók, amik a scraper által hozzárendelt tag-ekben szerepelnek,
 * pl. "OLAF", "közbeszerzés", de nem feltétlenül a címben.)
 */
export default function useFilteredCases(data, { searchTerm, filterStatus, filterCat, maxAmount }) {
  return useMemo(() => {
    if (!data) return [];
    const q = searchTerm.toLowerCase().trim();
    return data.cases.filter(c =>
      (!q
        || c.title.toLowerCase().includes(q)
        || c.involved_persons.some(p => p.name.toLowerCase().includes(q))
        || (c.description && c.description.toLowerCase().includes(q))
        || (c.tags && c.tags.some(tag => tag.toLowerCase().includes(q)))
      ) &&
      (filterStatus === 'all' || c.status === filterStatus) &&
      (filterCat === 'all' || c.category === filterCat) &&
      (c.amount_huf == null || c.amount_huf <= maxAmount * 1e9)
    );
  }, [data, searchTerm, filterStatus, filterCat, maxAmount]);
}
