import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ===== Helpers for UI =====
function startOfDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dueBadge(dueDate) {
  const due = startOfDay(dueDate);
  if (!due)
    return {
      label: "No due date",
      className: "bg-muted text-muted-foreground",
    };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = due.getTime() - today.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < 0)
    return {
      label: "Overdue",
      className: "bg-destructive text-destructive-foreground",
    };
  if (diff === 0)
    return { label: "Due today", className: "bg-amber-500 text-white" };
  if (diff <= 7 * oneDay)
    return { label: "Due soon", className: "bg-emerald-600 text-white" };

  return {
    label: "Awaiting response",
    className: "bg-secondary text-secondary-foreground",
  };
}

// ===== Reusable Components =====

export const StatsSection = ({ title, stats }) => {
  if (stats.total === 0) {
    return (
      <div className="mb-6 text-sm text-muted-foreground">
        There are currently no outstanding {title.toLowerCase()} for your school.
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-3 text-sm font-semibold text-muted-foreground">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Due in next 7 days</CardDescription>
            <CardTitle className="text-2xl">{stats.dueSoon}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl">{stats.overdue}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export const ConsultationItem = ({ item, onClick }) => {
  const badge = dueBadge(item.dueDate);
  return (
    <button
      type="button"
      className={cn(
        "text-left rounded-xl border bg-card p-4 transition",
        "hover:shadow-sm hover:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{item.impulseId}</div>
          <div className="text-sm text-muted-foreground">
            {item.forename} {item.surname}
          </div>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </div>

      <Separator className="my-3" />

      <div className="text-sm">
        <div className="text-muted-foreground">Due date</div>
        <div className="font-medium">
          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "—"}
        </div>
      </div>
    </button>
  );
};