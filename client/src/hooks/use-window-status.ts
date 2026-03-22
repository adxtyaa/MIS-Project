import { useState, useEffect, useCallback } from "react";
import type { WindowStatus } from "../lib/mock-data";
import { getWindowStatus } from "../lib/mock-api";

export function useWindowStatus() {
  const [status, setStatus] = useState<WindowStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getWindowStatus();
    setStatus(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
