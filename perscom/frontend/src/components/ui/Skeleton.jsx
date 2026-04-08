export default function Skeleton({ width = '100%', height = 16, className = '', style }) {
  return <div className={`skeleton ${className}`} style={{ width, height, ...style }} />
}

export function SkeletonCard() {
  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton rounded-full" style={{ width: 40, height: 40 }} />
        <div className="flex-1">
          <Skeleton height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={12} />
        </div>
      </div>
      <Skeleton height={12} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={12} />
    </div>
  )
}
