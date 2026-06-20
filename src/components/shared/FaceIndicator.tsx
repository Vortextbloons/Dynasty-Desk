export function FaceIndicator({
  value,
  showLabel = false,
}: {
  value: number
  showLabel?: boolean
}) {
  let face: string
  let label: string
  let color: string

  if (value >= 75) {
    face = '😊'
    label = 'Happy'
    color = 'text-emerald-500'
  } else if (value >= 50) {
    face = '😐'
    label = 'Neutral'
    color = 'text-amber-500'
  } else {
    face = '😞'
    label = 'Unhappy'
    color = 'text-red-500'
  }

  return (
    <span className={`inline-flex items-center gap-1 ${color}`} title={`${value}/100`}>
      <span>{face}</span>
      {showLabel && <span className="text-xs">{label}</span>}
    </span>
  )
}
