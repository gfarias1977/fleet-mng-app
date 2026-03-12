import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Progress className="w-full h-1 animate-pulse" value={undefined} />
      <div className="space-y-2">
        {/* Search bar skeleton */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        {/* Table header */}
        <Skeleton className="h-10 w-full" />
        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
        {/* Pagination */}
        <div className="flex justify-end mt-4">
          <Skeleton className="h-9 w-72" />
        </div>
      </div>
    </div>
  );
}
