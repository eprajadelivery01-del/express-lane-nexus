import { useMemo } from "react";
import type { DeliveryWithRelations } from "@/services/deliveries";

/**
 * useUniqueDeliveries
 * Hook to deduplicate deliveries in the UI.
 * Matches by ID (obviously) and also by a "fuzzy" heuristic for 
 * identical records created within the same second (double-click prevention).
 */
export function useUniqueDeliveries(deliveries: DeliveryWithRelations[]) {
  return useMemo(() => {
    if (!deliveries || deliveries.length === 0) return [];

    const seen = new Set<string>();
    const fuzzySeen = new Set<string>();
    
    return deliveries.filter((delivery) => {
      // 1. Deduplicação por ID (básico)
      if (seen.has(delivery.id)) return false;
      seen.add(delivery.id);

      // 2. Deduplicação por Heurística (Fuzzy Match)
      // Se tiver o mesmo company_id, mesmo valor e mesmo cliente, 
      // e foi criado no MESMO SEGUNDO, provavelmente é um erro de duplicação do sistema.
      const timestamp = new Date(delivery.created_at).getTime();
      const secondTimestamp = Math.floor(timestamp / 1000);
      
      const fuzzyKey = `${delivery.company_id}-${delivery.customer_name}-${delivery.value}-${secondTimestamp}`;
      
      if (fuzzySeen.has(fuzzyKey)) {
        console.warn(`[Deduplication] Item duplicado detectado e ocultado: ${delivery.id} (Key: ${fuzzyKey})`);
        return false;
      }
      
      fuzzySeen.add(fuzzyKey);
      return true;
    });
  }, [deliveries]);
}
