import { motion } from 'framer-motion'
import { Cable, Plus, Settings2, Trash2 } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import { HousePreviewScene } from '../../HousePreviewScene'
import { propTypes } from '../types'
import { Button } from '../shared/Button'
import { Card } from '../shared/Card'
import { CardHeader } from '../shared/CardHeader'
import { Progress } from '../shared/Progress'

export interface DisplaySetupWorkspaceProps {
  controllers: number
  channelsPerController: number
  setControllers: (n: number) => void
  setChannelsPerController: (n: number) => void
  propsState: DisplayProp[]
  selectedPropId: string | null
  setSelectedPropId: (id: string | null) => void
  totalChannels: number
  usedChannels: number
  remainingChannels: number
  newPropName: string
  setNewPropName: (v: string) => void
  newPropType: string
  setNewPropType: (v: string) => void
  newPropChannels: number
  setNewPropChannels: (v: number) => void
  addProp: () => void
  removeProp: (id: string) => void
}

export function DisplaySetupWorkspace({
  controllers,
  channelsPerController,
  setControllers,
  setChannelsPerController,
  propsState,
  selectedPropId,
  setSelectedPropId,
  totalChannels,
  usedChannels,
  remainingChannels,
  newPropName,
  setNewPropName,
  newPropType,
  setNewPropType,
  newPropChannels,
  setNewPropChannels,
  addProp,
  removeProp,
}: DisplaySetupWorkspaceProps) {
  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      <div className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <Card>
          <CardHeader
            title="Guided Display Setup"
            description="Define controllers, channel capacity, props, and fake smart recommendations."
            icon={Cable}
          />
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Controllers</div>
                <input
                  type="number"
                  min={1}
                  value={controllers}
                  onChange={(e) => setControllers(Number(e.target.value || 1))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Channels / Controller</div>
                <input
                  type="number"
                  min={1}
                  value={channelsPerController}
                  onChange={(e) => setChannelsPerController(Number(e.target.value || 1))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Capacity usage</div>
                  <div className="text-sm text-slate-500">Remaining channels: {remainingChannels}</div>
                </div>
                <div className="rounded-full bg-brand-green px-3 py-1 text-xs text-white shadow-brand-soft">
                  {usedChannels}/{totalChannels}
                </div>
              </div>
              <div className="mt-4">
                <Progress value={Math.min(100, (usedChannels / Math.max(1, totalChannels)) * 100)} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-700">Add a prop</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="Prop name"
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {propTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={newPropChannels}
                  onChange={(e) => setNewPropChannels(Number(e.target.value || 1))}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="mt-3">
                <Button onClick={addProp}>
                  <Plus className="h-4 w-4" /> Add Prop
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              <div className="font-medium text-brand-green">Fake scope details</div>
              <div className="mt-2">
                This area demonstrates what the real app would eventually handle: controller families,
                channel banks, prop grouping, recommended output assignments, conflict detection, and
                suggested sequencing roles for each prop type.
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Prop Mapping Suggestions"
            description="Believable fake detail for what LightCanvas would recommend per prop."
            icon={Settings2}
          />
          <div className="h-[min(520px,65vh)] space-y-3 overflow-y-auto p-6 pr-4">
            {propsState.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-green/35 bg-brand-green/5 p-8 text-center text-sm leading-6 text-slate-600">
                <p className="font-medium text-brand-green">No props yet</p>
                <p className="mt-2">
                  Add props using the form on the left. Your list is saved to your account automatically.
                </p>
              </div>
            ) : (
              propsState.map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => setSelectedPropId(prop.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedPropId === prop.id
                      ? 'border-brand-green bg-brand-green/5 ring-1 ring-brand-green/25'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{prop.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-slate-200 px-2 py-1">{prop.type}</span>
                        <span className="rounded-full border border-slate-200 px-2 py-1">{prop.controller}</span>
                        <span className="rounded-full border border-slate-200 px-2 py-1">
                          Channels {prop.start}-{prop.start + prop.channels - 1}
                        </span>
                        <span className="rounded-full border border-slate-200 px-2 py-1">
                          Priority: {prop.priority}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeProp(prop.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    {prop.notes}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      <HousePreviewScene
        props={propsState}
        selectedPropId={selectedPropId}
        onSelectProp={(id) => setSelectedPropId(String(id))}
      />
    </motion.div>
  )
}
