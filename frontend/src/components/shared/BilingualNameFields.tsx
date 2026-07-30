import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { suggestUrduName } from '@/lib/urduSuggest'
import { cn } from '@/lib/utils'

interface BilingualNameFieldsProps {
  nameValue: string
  nameUrduValue: string
  onNameChange: (value: string) => void
  onNameUrduChange: (value: string) => void
  nameError?: string
  nameLabel?: string
  nameUrduLabel?: string
  /** When true, keep overwriting Urdu while user edits English (until Urdu is manually edited). */
  autoFill?: boolean
  className?: string
}

/**
 * English + Urdu name fields.
 * Typing English auto-fills Urdu from Mandi dictionary when Urdu is empty / not manually locked.
 */
export function BilingualNameFields({
  nameValue,
  nameUrduValue,
  onNameChange,
  onNameUrduChange,
  nameError,
  nameLabel,
  nameUrduLabel,
  autoFill = true,
  className,
}: BilingualNameFieldsProps) {
  const { t } = useTranslation()
  const urduTouched = React.useRef(false)

  const handleNameChange = (value: string) => {
    onNameChange(value)
    if (!autoFill) return
    if (urduTouched.current && nameUrduValue.trim()) return
    const suggestion = suggestUrduName(value)
    if (suggestion) onNameUrduChange(suggestion)
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <div>
        <Label>{nameLabel || t('common.name')}</Label>
        <Input
          dir="ltr"
          lang="en"
          value={nameValue}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Potato / Al-Noor Traders"
        />
        {nameError && <p className="mt-1 text-sm text-danger">{nameError}</p>}
      </div>
      <div>
        <Label>{nameUrduLabel || t('common.nameUrdu')}</Label>
        <Input
          className="font-urdu text-lg"
          dir="rtl"
          lang="ur"
          value={nameUrduValue}
          onChange={(e) => {
            urduTouched.current = true
            onNameUrduChange(e.target.value)
          }}
          placeholder="اردو نام خود بخود آئے گا"
        />
        <p className="mt-1 text-xs text-muted font-urdu">
          انگریزی نام لکھیں — اردو خود لکھ جائے گی
        </p>
      </div>
    </div>
  )
}
