import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, className }) {
  return (
    <div className={cn(
      "mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center",
      className
    )}>
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 opacity-40" />}
      {title && <p className="font-medium text-foreground">{title}</p>}
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
