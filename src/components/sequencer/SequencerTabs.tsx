import type { TabValue } from './types'
import { sequencerTabs } from './types'
import { PillTabs } from './shared/PillTabs'

export function SequencerTabs({
  value,
  onChange,
}: {
  value: TabValue
  onChange: (v: TabValue) => void
}) {
  return <PillTabs tabs={sequencerTabs} value={value} onChange={onChange} />
}
