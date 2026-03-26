import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <div className="flex border-b border-gray-100 w-full mb-2 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-32 mx-2" />
        ))}
      </div>

      <div className="flex flex-col gap-6 items-start w-full">
        <div className="flex flex-col w-full gap-2 lg:bg-white lg:border lg:p-4 lg:shadow-sm lg:rounded-xl">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <Skeleton className="h-8 w-48 mt-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
              <div className="flex items-start gap-4">
                <Skeleton className="w-20 h-20 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
