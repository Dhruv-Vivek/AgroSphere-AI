import { useState } from 'react'
import { Sprout } from 'lucide-react'
import { CROP_OPTIONS } from '../data/crops'

export default function CropImagePicker({ value, onChange, label = 'Crop' }) {
  const [broken, setBroken] = useState(() => ({}))

  const markBroken = (id) => {
    setBroken((b) => ({ ...b, [id]: true }))
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {CROP_OPTIONS.map((c) => {
          const selected = value === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`group relative overflow-hidden rounded-xl border-2 bg-white text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                selected ? 'border-green-600 ring-2 ring-green-500/30' : 'border-gray-100 hover:border-green-300'
              }`}
            >
              <div className="relative aspect-square w-full bg-gradient-to-br from-green-50 to-emerald-100">
                {!broken[c.id] ? (
                  <img
                    src={c.image}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                    onError={() => markBroken(c.id)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-green-700">
                    <Sprout className="h-9 w-9" aria-hidden />
                  </div>
                )}
                {selected && (
                  <span className="absolute inset-x-0 bottom-0 bg-green-600/90 py-0.5 text-center text-[10px] font-bold text-white">
                    ✓
                  </span>
                )}
              </div>
              <span className="block truncate px-1 py-1.5 text-center text-[11px] font-semibold text-gray-800">
                {c.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
