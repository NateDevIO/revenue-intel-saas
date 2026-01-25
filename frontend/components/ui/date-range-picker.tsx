"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "./button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

export interface DateRange {
  start: string | null
  end: string | null
  preset?: string
}

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange) => void
}

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
  { label: "All time", days: null },
]

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDateRange(days: number | null): DateRange {
  if (days === null) {
    return { start: null, end: null, preset: 'all' }
  }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  return {
    start: formatDate(start),
    end: formatDate(end),
    preset: `${days}d`,
  }
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState(value?.preset || "30d")

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)

    if (preset === "all") {
      onChange(getDateRange(null))
      return
    }

    const days = parseInt(preset.replace('d', ''))
    onChange(getDateRange(days))
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((preset) => (
            <SelectItem
              key={preset.label}
              value={preset.days === null ? "all" : `${preset.days}d`}
            >
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
