import { Skeleton } from '@/components/ui/skeleton'

/** Quatro cards falsos, de alturas diferentes, enquanto a coluna carrega. */
export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="rounded-lg bg-card border border-border/40 p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="pt-2 border-t border-border/30 mt-1">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="rounded-lg bg-card border border-border/40 p-3 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-2 border-t border-border/30 mt-1">
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="rounded-lg bg-card border border-border/40 p-3 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-2 border-t border-border/30 mt-1">
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <div className="rounded-lg bg-card border border-border/40 p-3 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-2 border-t border-border/30 mt-1">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  )
}
