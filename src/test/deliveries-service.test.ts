import { describe, it, expect } from "vitest";
import { normalizeDeliveryData } from "../services/deliveries";

describe("src/services/deliveries.ts - normalizeDeliveryData", () => {
  it("should merge payment_method from paymentMethodsByOrderId", () => {
    const rawDeliveries = [
      { id: "d1", status: "pending", order_id: "o1" },
      { id: "d2", status: "delivered", order_id: "o2" },
      { id: "d3", status: "cancelled", order_id: null }, // no order
    ];

    const paymentMap = new Map<string, string | null>([
      ["o1", "pix"],
      ["o2", "credit_card"],
    ]);

    const normalized = normalizeDeliveryData(rawDeliveries, paymentMap);

    expect(normalized).toHaveLength(3);
    
    // d1 matches o1
    expect(normalized[0].payment_method).toBe("pix");
    
    // d2 matches o2
    expect(normalized[1].payment_method).toBe("credit_card");
    
    // d3 has no order_id
    expect(normalized[2].payment_method).toBeNull();
  });

  it("should normalize driver data", () => {
    const rawDeliveries = [
      {
        id: "d1",
        status: "pending",
        delivery_drivers: {
          id: "driver1",
          user_id: "u1",
          full_name: "João Silva",
          phone: "123",
          vehicle_type: "motorcycle",
          vehicle_plate: "ABC-1234",
        }
      }
    ];

    const normalized = normalizeDeliveryData(rawDeliveries, new Map());

    expect(normalized[0].delivery_drivers).toEqual({
      id: "driver1",
      user_id: "u1",
      full_name: "João Silva",
      phone: "123",
      vehicle_type: "motorcycle",
      vehicle_plate: "ABC-1234",
    });
  });

  it("should parse dates for delivered_at", () => {
    const rawDeliveries = [
      { id: "d1", status: "delivered", delivered_at: "2026-06-30T10:00:00Z" },
      { id: "d2", status: "completed", completed_at: "2026-06-30T11:00:00Z" },
    ];

    const normalized = normalizeDeliveryData(rawDeliveries, new Map());

    expect(normalized[0].delivered_at).toBe("2026-06-30T10:00:00Z");
    expect(normalized[1].delivered_at).toBe("2026-06-30T11:00:00Z");
  });
});
