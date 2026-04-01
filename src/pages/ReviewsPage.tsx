import { AdminLayout } from "@/components/admin/AdminLayout";
import { mockReviews, mockDrivers } from "@/data/mockData";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReviewsPage() {
  return (
    <AdminLayout title="Avaliações" subtitle="Feedback das entregas">
      <div className="space-y-4">
        {mockReviews.map((review) => {
          const driver = mockDrivers.find(d => d.id === review.driver_id);
          return (
            <div key={review.id} className="bg-card rounded-xl p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <Star className="h-5 w-5 text-warning fill-warning" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-foreground text-sm">{driver?.name}</span>
                      <span className="text-xs text-muted-foreground">• OS #{review.delivery_id}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn("h-3.5 w-3.5", i < review.rating ? "text-warning fill-warning" : "text-muted")}
                        />
                      ))}
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

