export const CHRISTMAS_PROP_TYPES = [
  'Mega Tree',
  'Mini Tree',
  'Talking Tree Face',
] as const

export const CHRISTMAS_TOOLS = [
  { id: 'mega-tree' as const, label: 'Mega Tree', propType: 'Mega Tree',         defaultColor: '#20ff40' },
  { id: 'mini-tree' as const, label: 'Mini Tree', propType: 'Mini Tree',         defaultColor: '#20ff40' },
  { id: 'face' as const,      label: 'Face',      propType: 'Talking Tree Face', defaultColor: '#20ff40' },
]
