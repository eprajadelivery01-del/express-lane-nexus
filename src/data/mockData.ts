import { Delivery, DeliveryDriver, Company, Customer, Region, Order, Review, Occurrence } from "@/types/models";

export const mockRegions: Region[] = [
  { id: "1", name: "Centro", color: "#EA384C", price: 8.00 },
  { id: "2", name: "Zona Norte", color: "#F97316", price: 12.00 },
  { id: "3", name: "Zona Sul", color: "#0EA5E9", price: 15.00 },
  { id: "4", name: "Zona Leste", color: "#8B5CF6", price: 18.00 },
  { id: "5", name: "Zona Oeste", color: "#10B981", price: 14.00 },
];

export const mockCompanies: Company[] = [
  { id: "1", name: "Pizzaria Bella", phone: "(11) 99999-0001", address: "Rua das Flores, 123", region_id: "1" },
  { id: "2", name: "Farmácia Saúde", phone: "(11) 99999-0002", address: "Av. Brasil, 456", region_id: "2" },
  { id: "3", name: "Restaurante Sabor", phone: "(11) 99999-0003", address: "Rua Paraná, 789", region_id: "1" },
  { id: "4", name: "Pet Shop Amigo", phone: "(11) 99999-0004", address: "Av. Paulista, 1000", region_id: "3" },
];

export const mockDrivers: DeliveryDriver[] = [
  { id: "1", name: "Carlos Silva", phone: "(11) 98888-0001", vehicle: "Moto", is_online: true, rating: 4.8 },
  { id: "2", name: "João Santos", phone: "(11) 98888-0002", vehicle: "Moto", is_online: true, rating: 4.5 },
  { id: "3", name: "Pedro Oliveira", phone: "(11) 98888-0003", vehicle: "Bicicleta", is_online: false, rating: 4.9 },
  { id: "4", name: "Lucas Souza", phone: "(11) 98888-0004", vehicle: "Moto", is_online: true, rating: 4.2 },
];

export const mockCustomers: Customer[] = [
  { id: "1", name: "Maria da Silva", cpf: "123.456.789-00", phone: "(11) 97777-0001" },
  { id: "2", name: "Ana Costa", cpf: "987.654.321-00", phone: "(11) 97777-0002" },
  { id: "3", name: "Roberto Almeida", cpf: "456.789.123-00", phone: "(11) 97777-0003" },
];

export const mockDeliveries: Delivery[] = [
  { id: "1", company_id: "1", company_name: "Pizzaria Bella", driver_id: "1", driver_name: "Carlos Silva", customer_name: "Maria da Silva", address: "Rua Augusta, 500", region_id: "1", region_name: "Centro", status: "in_route", value: 8.00, commission: 5.00, created_at: "2026-04-01T10:30:00", updated_at: "2026-04-01T10:45:00" },
  { id: "2", company_id: "2", company_name: "Farmácia Saúde", driver_id: "2", driver_name: "João Santos", customer_name: "Ana Costa", address: "Av. Consolação, 200", region_id: "2", region_name: "Zona Norte", status: "pending", value: 12.00, commission: 7.00, created_at: "2026-04-01T11:00:00", updated_at: "2026-04-01T11:00:00" },
  { id: "3", company_id: "3", company_name: "Restaurante Sabor", driver_id: "1", driver_name: "Carlos Silva", customer_name: "Roberto Almeida", address: "Rua Oscar Freire, 100", region_id: "1", region_name: "Centro", status: "completed", value: 8.00, commission: 5.00, created_at: "2026-04-01T08:00:00", updated_at: "2026-04-01T08:45:00" },
  { id: "4", company_id: "1", company_name: "Pizzaria Bella", driver_id: null, driver_name: null, customer_name: "Maria da Silva", address: "Rua Haddock Lobo, 300", region_id: "3", region_name: "Zona Sul", status: "pending", value: 15.00, commission: 9.00, created_at: "2026-04-01T11:15:00", updated_at: "2026-04-01T11:15:00" },
  { id: "5", company_id: "4", company_name: "Pet Shop Amigo", driver_id: "4", driver_name: "Lucas Souza", customer_name: "Ana Costa", address: "Rua Bela Cintra, 400", region_id: "1", region_name: "Centro", status: "collecting", value: 8.00, commission: 5.00, created_at: "2026-04-01T11:20:00", updated_at: "2026-04-01T11:30:00" },
  { id: "6", company_id: "2", company_name: "Farmácia Saúde", driver_id: "3", driver_name: "Pedro Oliveira", customer_name: "Roberto Almeida", address: "Av. Faria Lima, 800", region_id: "4", region_name: "Zona Leste", status: "cancelled", value: 18.00, commission: 10.00, created_at: "2026-03-31T16:00:00", updated_at: "2026-03-31T16:30:00" },
];

export const mockOccurrences: Occurrence[] = [
  { id: "1", driver_id: "1", driver_name: "Carlos Silva", type: "motorcycle_issue", description: "Pneu furado na Rua Augusta", delivery_id: "3", created_at: "2026-04-01T09:00:00", status: "open" },
  { id: "2", driver_id: "2", driver_name: "João Santos", type: "accident", description: "Colisão leve com veículo parado", delivery_id: null, created_at: "2026-03-31T15:00:00", status: "resolved" },
];

export const mockReviews: Review[] = [
  { id: "1", delivery_id: "3", driver_id: "1", rating: 5, comment: "Entrega rápida e cuidadosa!", created_at: "2026-04-01T09:00:00" },
  { id: "2", delivery_id: "6", driver_id: "3", rating: 3, comment: "Demorou um pouco", created_at: "2026-03-31T17:00:00" },
];
