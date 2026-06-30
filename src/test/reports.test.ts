import { describe, it, expect } from "vitest";
import { filterDeliveriesByLocalParams, getValidDeliveries, calculateReportsTotals } from "../lib/reports";

describe("Reports calculations and filtering", () => {
  const mockDeliveries = [
    {
      id: "1",
      status: "delivered",
      region_id: "region_1",
      payment_method: "pix",
      delivery_fee: 10,
      commission: 2,
    },
    {
      id: "2",
      status: "completed",
      region_id: "region_2",
      payment_method: "cash",
      price: 15,
      commission: 3,
    },
    {
      id: "3",
      status: "pending",
      region_id: "region_1",
      payment_method: "credit",
      value: 20,
      commission: 4,
    },
    {
      id: "4",
      status: "cancelled",
      region_id: "region_2",
      payment_method: "pix",
      delivery_fee: 5,
      commission: 1,
    }
  ];

  it("should filter deliveries by region", () => {
    const result = filterDeliveriesByLocalParams(mockDeliveries, { regionFilter: "region_1" });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(["1", "3"]);
  });

  it("should filter deliveries by payment method", () => {
    const result = filterDeliveriesByLocalParams(mockDeliveries, { paymentFilter: "pix" });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(["1", "4"]);
  });

  it("should filter deliveries by minVal and maxVal", () => {
    // getDeliveryValue fallback priority: delivery_fee -> price -> value
    // id 1 = 10, id 2 = 15, id 3 = 20, id 4 = 5
    const resultMin = filterDeliveriesByLocalParams(mockDeliveries, { minVal: "10" });
    expect(resultMin).toHaveLength(3); // 10, 15, 20

    const resultMax = filterDeliveriesByLocalParams(mockDeliveries, { maxVal: "15" });
    expect(resultMax).toHaveLength(3); // 10, 15, 5

    const resultRange = filterDeliveriesByLocalParams(mockDeliveries, { minVal: "10", maxVal: "15" });
    expect(resultRange).toHaveLength(2); // 10, 15
    expect(resultRange.map(r => r.id)).toEqual(["1", "2"]);
  });

  it("should return valid deliveries (delivered/completed)", () => {
    const valid = getValidDeliveries(mockDeliveries);
    expect(valid).toHaveLength(2);
    expect(valid.map(r => r.id)).toEqual(["1", "2"]);
  });

  it("should calculate correct totals", () => {
    const valid = getValidDeliveries(mockDeliveries);
    const { totalValue, totalCommission, completedCount } = calculateReportsTotals(valid);

    // totalValue: 10 + 15 = 25
    expect(totalValue).toBe(25);
    // totalCommission: 2 + 3 = 5
    expect(totalCommission).toBe(5);
    expect(completedCount).toBe(2);
  });
});
