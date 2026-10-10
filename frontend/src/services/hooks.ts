import { useEffect, useState } from "react";
import { api } from "./api";
import type { MedicineSummary } from "../types";

let cache: MedicineSummary[] | null = null;

/** Supported medicines (for autocomplete lists). Cached after first load. */
export function useMedicines() {
  const [list, setList] = useState<MedicineSummary[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    api.medicines("").then((m) => { cache = m; setList(m); }).catch(() => undefined);
  }, []);
  return list;
}
