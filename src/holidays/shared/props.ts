export const SHARED_PROP_TYPES = [
  'Roofline',
  'Arch',
  'Matrix',
  'Stake',
  '+ Custom',
] as const

export const SHARED_TOOLS = [
  { id: 'roofline' as const, label: 'Roofline', propType: 'Roofline', defaultColor: '#ffe8c0' },
  { id: 'arch' as const,     label: 'Arch',     propType: 'Arch',     defaultColor: '#ffe8c0' },
  { id: 'matrix' as const,   label: 'Matrix',   propType: 'Matrix',   defaultColor: '#ffe8c0' },
  { id: 'stake' as const,    label: 'Stake',    propType: 'Stake',    defaultColor: '#ffe8c0' },
  { id: 'custom' as const,   label: '+ Custom', propType: 'Smart Pixel', defaultColor: '#ffe8c0' },
]
