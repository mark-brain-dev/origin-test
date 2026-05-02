import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useRealtimeSync() {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = `${BASE}/api/events`;
    const es = new EventSource(url);
    esRef.current = es;

    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    };

    es.addEventListener("page:created", invalidateAll);
    es.addEventListener("page:updated", invalidateAll);
    es.addEventListener("page:deleted", invalidateAll);
    es.addEventListener("page:content:saved", () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
    });

    es.onerror = () => {
      setTimeout(() => {}, 3000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [qc]);
}
