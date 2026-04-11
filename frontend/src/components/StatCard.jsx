import { Loader2 } from 'lucide-react'

/**
 * @param {{ title: string, value: string | number, subtitle?: string, icon?: React.ReactNode, loading?: boolean }} props
 */
export default function StatCard({ title, value, subtitle, icon, loading }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </p>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              <span className="text-sm text-gray-500">Loading…</span>
            </div>
          ) : (
            <p className="mt-2 truncate text-2xl font-bold tracking-tight text-gray-900">
              {value}
            </p>
          )}
          {subtitle && !loading ? (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
