export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonSummaryCard() {
  return (
    <div className="card flex items-center gap-4">
      <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-5 w-28" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr>
      <td className="px-4 py-3"><SkeletonLine className="h-3 w-20" /></td>
      <td className="px-4 py-3"><SkeletonLine className="h-3 w-40" /></td>
      <td className="px-4 py-3"><SkeletonLine className="h-3 w-24" /></td>
      <td className="px-4 py-3"><SkeletonLine className="h-3 w-24" /></td>
      <td className="px-4 py-3"><SkeletonLine className="h-3 w-16" /></td>
      <td className="px-4 py-3"><SkeletonLine className="h-3 w-20 ml-auto" /></td>
      <td className="px-4 py-3" />
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-full shrink-0" />
        <SkeletonLine className="h-4 w-32" />
      </div>
      <SkeletonLine className="h-2.5 w-full rounded-full" />
      <div className="flex justify-between">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="skeleton w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="h-3 w-48" />
        <SkeletonLine className="h-2.5 w-24" />
      </div>
      <SkeletonLine className="h-4 w-20" />
    </div>
  );
}
