import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  iconBg?: string;
}

export function StatsCard({ title, value, change, changeType = "neutral", icon, iconBg }: StatsCardProps) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          {change && (
            <p className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground",
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBg || "bg-primary/10")}>
          {icon}
        </div>
      </div>
    </div>
  );
}
