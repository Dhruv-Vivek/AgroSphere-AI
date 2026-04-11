import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'

/**
 * Stepper — React Bits style
 * Props:
 *   steps: Array<{ label: string, description?: string, icon?: ReactNode }>
 *   currentStep: number (0-indexed)
 *   onChange?: (index: number) => void
 *   orientation?: 'horizontal' | 'vertical'
 *   variant?: 'default' | 'minimal'
 */
export default function Stepper({
  steps = [],
  currentStep = 0,
  onChange,
  orientation = 'horizontal',
  variant = 'default',
}) {
  const isVertical = orientation === 'vertical'

  return (
    <div
      className={[
        'relative',
        isVertical ? 'flex flex-col gap-0' : 'flex items-start gap-0',
      ].join(' ')}
      role="list"
      aria-label="Progress steps"
    >
      {steps.map((step, i) => {
        const isDone    = i < currentStep
        const isActive  = i === currentStep
        const isLast    = i === steps.length - 1

        return (
          <div
            key={i}
            role="listitem"
            className={[
              'relative flex',
              isVertical ? 'flex-row items-start gap-4 pb-8' : 'flex-col items-center flex-1',
              isLast && isVertical ? 'pb-0' : '',
            ].join(' ')}
          >
            {/* Connector line */}
            {!isLast && (
              <div
                aria-hidden
                className={[
                  'absolute transition-all duration-500',
                  isVertical
                    ? 'left-5 top-10 bottom-0 w-0.5'
                    : 'top-5 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5',
                  isDone ? 'bg-emerald-500' : 'bg-gray-200',
                ].join(' ')}
              />
            )}

            {/* Step circle */}
            <button
              type="button"
              onClick={() => onChange?.(i)}
              disabled={!onChange}
              aria-label={`Step ${i + 1}: ${step.label}`}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                'text-sm font-bold transition-all duration-300 outline-none',
                'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                isDone
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                  : isActive
                  ? 'bg-white text-emerald-600 ring-2 ring-emerald-500 shadow-lg shadow-emerald-900/10'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                onChange ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {isDone ? (
                <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              ) : step.icon ? (
                <span className="flex h-5 w-5 items-center justify-center">{step.icon}</span>
              ) : (
                <span>{i + 1}</span>
              )}

              {/* Active pulse ring */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20"
                />
              )}
            </button>

            {/* Step label */}
            <div
              className={[
                isVertical ? 'flex-1 pt-1.5' : 'mt-3 text-center px-1',
                !isVertical && 'w-full',
              ].join(' ')}
            >
              <p
                className={[
                  'text-xs font-semibold leading-tight transition-colors duration-200',
                  isActive ? 'text-gray-900' : isDone ? 'text-emerald-600' : 'text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </p>
              {step.description && variant !== 'minimal' && (
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * StepperPanel — controlled content pane that animates between steps
 * Usage: wrap each step's content in this component
 */
export function StepperPanel({ children, step, currentStep }) {
  const isActive = step === currentStep
  const ref = useRef(null)

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  return (
    <div
      ref={ref}
      aria-hidden={!isActive}
      className={[
        'transition-all duration-300 overflow-hidden',
        isActive
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none h-0',
      ].join(' ')}
    >
      {isActive ? children : null}
    </div>
  )
}
