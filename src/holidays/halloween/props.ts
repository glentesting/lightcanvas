export const HALLOWEEN_PROP_TYPES = [
  'Pumpkin Face',
  'Ghost',
  'Skull',
  'Gravestone',
] as const

export const HALLOWEEN_TOOLS = [
  { id: 'pumpkin' as const,    label: 'Pumpkin',    propType: 'Pumpkin Face', defaultColor: '#ff6600' },
  { id: 'ghost' as const,      label: 'Ghost',       propType: 'Ghost',        defaultColor: '#e8e8ff' },
  { id: 'skull' as const,      label: 'Skull',       propType: 'Skull',        defaultColor: '#e0e0e0' },
  { id: 'gravestone' as const, label: 'Gravestone',  propType: 'Gravestone',   defaultColor: '#9999aa' },
]
