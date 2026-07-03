import { useMemo } from "react";
import { getDeliveryValue } from "@/lib/delivery";
import type { DeliveryWithRelations } from "@/services/deliveries";

export function useFinancialTotals(validDeliveries: DeliveryWithRelations[], drivers: any[]) {
  return useMemo(() => {
    let totalValue = 0;
    let totalCommission = 0;
    
    const enrichedDeliveries = validDeliveries.map(d => {
      const value = getDeliveryValue(d);
      totalValue += value;
      
      let commission = 0;
      if (d.driver_id) {
        const driver = drivers?.find(dr => dr.id === d.driver_id);
        const rate = (driver?.commission_rate !== undefined && driver?.commission_rate !== null)
          ? Number(driver.commission_rate) 
          : 0.40; // Fallback tax
        commission = rate;
      } else {
        commission = Number((d as any).commission ?? 0);
      }
      totalCommission += commission;
      
      return {
        ...d,
        calculatedValue: value,
        calculatedCommission: commission
      };
    });

    return {
      totalValue,
      totalCommission,
      completedCount: enrichedDeliveries.length,
      enrichedDeliveries
    };
  }, [validDeliveries, drivers]);
}
