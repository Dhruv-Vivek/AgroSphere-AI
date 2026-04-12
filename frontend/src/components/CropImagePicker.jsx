import { CROP_OPTIONS } from '../data/crops'
import { CropThumbnail } from './AgroIllustrations'

export default function CropImagePicker({ value, onChange, label = 'Crop' }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {CROP_OPTIONS.map((crop) => {
          const selected = value === crop.id

          return (
            <button
              key={crop.id}
              type="button"
              onClick={() => onChange(crop.id)}
              className={`group relative overflow-hidden rounded-xl border-2 bg-white text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                selected ? 'border-green-600 ring-2 ring-green-500/30' : 'border-gray-100 hover:border-green-300'
              }`}
            >
              <div className="relative aspect-square w-full bg-gradient-to-br from-green-50 to-emerald-100">
                <CropThumbnail
                  crop={crop.id}
                  title={crop.label}
                  className="h-full w-full transition duration-200 group-hover:scale-105"
                />
                {selected && (
                  <span className="absolute inset-x-0 bottom-0 bg-green-600/90 py-0.5 text-center text-[10px] font-bold text-white">
                    Selected
                  </span>
                )}
              </div>
              <span className="block truncate px-1 py-1.5 text-center text-[11px] font-semibold text-gray-800">
                {crop.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
