import { AlertTriangleFilled } from '../../icons'
import { cn } from '@/lib/utils'

/*
 * The validation row under the range block: a critical triangle and body3
 * statusCritical text, px16. "Invalid range" when min >= max, "Invalid price"
 * when an end is outside the pool's tick bounds. Renders nothing when valid.
 */

interface RangeValidationProps {
  kind: 'range' | 'price' | null
  className?: string
}

function RangeValidation({ kind, className }: RangeValidationProps) {
  if (!kind) return null
  return (
    <div
      role="alert"
      data-slot="range-validation"
      className={cn('flex items-center gap-uni-4 px-uni-16 text-statusCritical', className)}
    >
      <AlertTriangleFilled className="size-uni-16" />
      <span className="text-body3">{kind === 'range' ? 'Invalid range' : 'Invalid price'}</span>
    </div>
  )
}

export { RangeValidation }
export type { RangeValidationProps }
