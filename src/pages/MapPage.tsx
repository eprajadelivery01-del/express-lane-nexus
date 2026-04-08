import { AdminLayout } from "@/components/admin/AdminLayout";
import { MapView } from "@/components/admin/MapView";

export default function MapPage() {
  return (
    <AdminLayout title="Mapa" subtitle="Rastreamento em tempo real">
      <div className="-m-4 md:-m-6 h-[calc(100vh-73px)] relative">
        <MapView />
      </div>
    </AdminLayout>
  );
}
