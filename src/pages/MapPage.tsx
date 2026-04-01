import { AdminLayout } from "@/components/admin/AdminLayout";
import { MapView } from "@/components/admin/MapView";
import { useAllRealtime } from "@/services/realtime";

export default function MapPage() {
  useAllRealtime();

  return (
    <AdminLayout title="Mapa" subtitle="Rastreamento em tempo real">
      <div className="-m-4 md:-m-6 h-[calc(100vh-73px)]">
        <MapView />
      </div>
    </AdminLayout>
  );
}
