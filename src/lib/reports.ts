import { getDeliveryValue } from "./delivery";
import type { DeliveryWithRelations } from "../services/deliveries";

export interface ReportFilters {
  regionFilter?: string;
  paymentFilter?: string;
  minVal?: string;
  maxVal?: string;
  statusFilter?: string;
}

export function filterDeliveriesByLocalParams(rawDeliveries: DeliveryWithRelations[], filters: ReportFilters) {
  const { regionFilter, paymentFilter, minVal, maxVal, statusFilter } = filters;
  
  return rawDeliveries.filter((d) => {
    if (regionFilter && d.region_id !== regionFilter) return false;
    if (paymentFilter && d.payment_method !== paymentFilter) return false;
    if (minVal && getDeliveryValue(d) < Number(minVal)) return false;
    if (maxVal && getDeliveryValue(d) > Number(maxVal)) return false;
    // "Finalizadas" deve incluir tanto 'delivered' quanto 'completed'
    if (statusFilter === "delivered" && !(d.status === "delivered" || (d.status as string) === "completed")) return false;
    return true;
  });
}

export function getValidDeliveries(deliveries: DeliveryWithRelations[]) {
  return deliveries.filter(d => d.status === "delivered" || (d.status as string) === "completed");
}

export function calculateReportsTotals(validDeliveries: DeliveryWithRelations[]) {
  const totalValue = validDeliveries.reduce((s, d) => s + getDeliveryValue(d), 0);
  const totalCommission = validDeliveries.reduce((s, d) => s + Number((d as unknown as Record<string, unknown>).commission ?? 0), 0);
  return { totalValue, totalCommission, completedCount: validDeliveries.length };
}
