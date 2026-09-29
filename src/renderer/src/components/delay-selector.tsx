import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  DelayConfig,
  DelayProfile,
  estimateDuration,
  formatDuration,
  PRESETS
} from '@/hooks/use-messages-queue'
import { Timer } from 'lucide-react'
import { useId, useRef, useState } from 'react'

const PROFILE_META: Record<DelayProfile, { label: string; description: string }> = {
  conservative: {
    label: 'Conservador',
    description: '25–60s entre mensagens · até 40/hora. Menor risco de bloqueio.'
  },
  moderate: {
    label: 'Médio',
    description: '10–30s entre mensagens · até 80/hora. Equilíbrio entre velocidade e segurança.'
  },
  fast: {
    label: 'Rápido',
    description: '3–8s entre mensagens · até 200/hora. Maior risco de banimento.'
  },
  custom: {
    label: 'Customizado',
    description: 'Defina seus próprios intervalos e limite por hora.'
  }
}

function getCustomConfig(
  delayMinRef: React.RefObject<HTMLInputElement | null>,
  delayMaxRef: React.RefObject<HTMLInputElement | null>,
  maxPerHourRef: React.RefObject<HTMLInputElement | null>
) {
  const min = Number(delayMinRef.current?.value ?? 15)
  const max = Number(delayMaxRef.current?.value ?? 40)
  const maxPerHour = Number(maxPerHourRef.current?.value ?? 60)

  return { min, max, maxPerHour, minMs: min * 1000, maxMs: max * 1000 }
}

export function DelaySelector({
  contactCount,
  onChange
}: {
  contactCount: number
  value: { profile: DelayProfile; config: DelayConfig }
  onChange: (v: { profile: DelayProfile; config: DelayConfig }) => void
}) {
  // const [customSeconds, setCustomSeconds] = useState({ min: 15, max: 40 })
  // const [customMaxPerHour, setCustomMaxPerHour] = useState(60)

  const radioId = useId()
  const inputId = useId()
  const [selectedValue, setSelectedValue] = useState<DelayProfile>('conservative')

  const delayMinRef = useRef<HTMLInputElement>(null)
  const delayMaxRef = useRef<HTMLInputElement>(null)
  const maxPerHourRef = useRef<HTMLInputElement>(null)

  const estimate =
    contactCount > 0
      ? estimateDuration(
          selectedValue === 'custom'
            ? getCustomConfig(delayMinRef, delayMaxRef, maxPerHourRef)
            : PRESETS[selectedValue],
          contactCount
        )
      : null

  const selectProfile = (profile: DelayProfile) => {
    if (profile === 'custom') {
      const { min, max, maxPerHour } = getCustomConfig(delayMinRef, delayMaxRef, maxPerHourRef)

      const config: DelayConfig = {
        minMs: min * 1000,
        maxMs: max * 1000,
        maxPerHour: maxPerHour
      }
      onChange({ profile, config })
    } else {
      onChange({ profile, config: PRESETS[profile] })
    }
  }

  const updateCustom = (patch: Partial<{ min: number; max: number; maxPerHour: number }>) => {
    const defaultMin = Number(delayMinRef.current?.value ?? 15)
    const defaultMax = Number(delayMaxRef.current?.value ?? 40)
    const defaultMaxPerHour = Number(maxPerHourRef.current?.value ?? 60)

    const min = patch.min ?? defaultMin
    const max = patch.max ?? defaultMax
    const maxPerHour = patch.maxPerHour ?? defaultMaxPerHour
    onChange({
      profile: 'custom',
      config: { minMs: min * 1000, maxMs: max * 1000, maxPerHour }
    })
  }

  return (
    <RadioGroup
      className="gap-6 max-w-[400px]"
      value={selectedValue}
      onValueChange={(value) => {
        setSelectedValue(value)
        selectProfile(value)
      }}
    >
      {(Object.keys(PROFILE_META) as DelayProfile[]).map((profile) => {
        if (profile === 'custom') return

        /* profile === 'custom'
            ? {
                minMs: customSeconds.min * 1000,
                maxMs: customSeconds.max * 1000,
                maxPerHour: customMaxPerHour
              }
            : */

        const meta = PROFILE_META[profile]
        return (
          <div className="flex items-start gap-2" key={profile}>
            <RadioGroupItem
              value={profile}
              id={profile}
              aria-describedby={`${profile}-description`}
              aria-controls={profile}
            />
            <div className="grow">
              <div className="grid grow gap-2">
                <Label htmlFor={`${radioId}-1`}>{meta.label}</Label>
                <p id={`${radioId}-1-description`} className="text-xs text-muted-foreground">
                  {meta.description}
                </p>
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex items-start gap-2">
        <RadioGroupItem
          value={'custom'}
          id={'custom'}
          aria-describedby={`custom-description`}
          aria-controls={'custom'}
        />
        <div className="grow">
          <div className="grid grow gap-2">
            <Label htmlFor={`${radioId}-1`}>{PROFILE_META.custom.label}</Label>
            <p id={`${radioId}-1-description`} className="text-xs text-muted-foreground">
              {PROFILE_META.custom.description}
            </p>
          </div>
          <div
            role="region"
            id={inputId}
            aria-labelledby={`${radioId}-1`}
            className="grid transition-all ease-in-out data-[state=collapsed]:grid-rows-[0fr] data-[state=expanded]:grid-rows-[1fr] data-[state=collapsed]:opacity-0 data-[state=expanded]:opacity-100"
            data-state={selectedValue === 'custom' ? 'expanded' : 'collapsed'}
          >
            <div className="pointer-events-none -m-2 overflow-hidden p-2">
              <div className="pointer-events-auto mt-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Delay mín. (s)</Label>
                  <Input
                    ref={delayMinRef}
                    type="number"
                    min={1}
                    defaultValue={15}
                    onChange={(e) => updateCustom({ min: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Delay máx. (s)</Label>
                  <Input
                    ref={delayMaxRef}
                    type="number"
                    min={1}
                    defaultValue={40}
                    onChange={(e) => updateCustom({ max: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Máx. por hora</Label>
                  <Input
                    ref={maxPerHourRef}
                    type="number"
                    min={1}
                    defaultValue={60}
                    onChange={(e) => updateCustom({ maxPerHour: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-muted px-3 py-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
          <Timer className="size-3.5 block mb-0.5 text-muted-foreground" />
          {estimate !== null
            ? `Tempo estimado: ~${formatDuration(estimate)}`
            : 'Envie a planilha para calcular o tempo'}
        </p>
      </div>
    </RadioGroup>
  )
}
