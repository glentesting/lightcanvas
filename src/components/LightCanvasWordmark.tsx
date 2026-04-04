type WordmarkTag = 'h1' | 'h2' | 'span' | 'div' | 'p'

export function LightCanvasWordmark({
  className = '',
  as: Tag = 'span',
}: {
  className?: string
  as?: WordmarkTag
}) {
  return (
    <Tag className={className}>
      <span className="text-brand-green">Light</span>
      <span className="text-brand-red">Canvas</span>
    </Tag>
  )
}
