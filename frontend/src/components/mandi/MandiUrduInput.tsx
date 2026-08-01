import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { liveConvertToUrdu, offlineUrdu } from '@/lib/urduTransliterate'

interface MandiUrduInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

/**
 * Urdu field — type English, converts to Urdu while typing (offline, instant).
 * Space commits the current word; no delayed Google overwrite.
 */
export function MandiUrduInput({
  value,
  onChange,
  className,
  onKeyDown,
  onPaste,
  onBlur,
  ...rest
}: MandiUrduInputProps) {
  /** Roman buffer for the word currently being typed */
  const romanRef = useRef('')
  /** Committed Urdu before the current roman word */
  const committedRef = useRef(value)
  const lastEmitted = useRef(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parent loaded/cleared form (not from our own emit)
  useEffect(() => {
    if (value !== lastEmitted.current) {
      committedRef.current = value
      romanRef.current = ''
      lastEmitted.current = value
    }
  }, [value])

  const emit = (committed: string, roman: string) => {
    committedRef.current = committed
    romanRef.current = roman
    const next = committed + (roman ? offlineUrdu(roman) : '')
    lastEmitted.current = next
    onChange(next)
  }

  const finalizeWord = (extra = '') => {
    const roman = romanRef.current
    if (!roman) {
      if (extra) emit(committedRef.current + extra, '')
      return
    }
    const converted = offlineUrdu(roman)
    emit(committedRef.current + converted + extra, '')
  }

  const clearSelectionOrBackspace = (fromDelete = false) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length

    // Selection: wipe selected range from committed display value
    if (start !== end) {
      const before = value.slice(0, start)
      const after = value.slice(end)
      // After selection delete, treat whole remaining as committed (no roman)
      emit(before + after, '')
      requestAnimationFrame(() => {
        el?.setSelectionRange(start, start)
      })
      return
    }

    if (romanRef.current) {
      if (fromDelete) {
        // Delete with caret in roman zone — drop first roman char
        emit(committedRef.current, romanRef.current.slice(1))
      } else {
        emit(committedRef.current, romanRef.current.slice(0, -1))
      }
      return
    }

    if (!committedRef.current) return

    const chars = [...committedRef.current]
    if (fromDelete) {
      // Rare: caret at start of committed — no-op for Delete at end
      return
    }
    chars.pop()
    emit(chars.join(''), '')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key

    if (key === 'Backspace') {
      e.preventDefault()
      clearSelectionOrBackspace(false)
      return
    }

    if (key === 'Delete') {
      e.preventDefault()
      clearSelectionOrBackspace(true)
      return
    }

    if (key === ' ') {
      e.preventDefault()
      finalizeWord(' ')
      return
    }

    if (key === 'Enter' || key === 'Tab') {
      if (romanRef.current) finalizeWord('')
      onKeyDown?.(e)
      return
    }

    if (/^[a-zA-Z']$/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      emit(committedRef.current, romanRef.current + key.toLowerCase())
      return
    }

    // Digits / punctuation — commit current word then append
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      finalizeWord(key)
      return
    }

    onKeyDown?.(e)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const converted = liveConvertToUrdu(e.clipboardData.getData('text'))
    emit(committedRef.current + converted, '')
    onPaste?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (romanRef.current) finalizeWord('')
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mobile / IME / autofill fallback — convert full string offline, no async
    const next = liveConvertToUrdu(e.target.value)
    emit(next, '')
  }

  return (
    <input
      {...rest}
      ref={inputRef}
      value={value}
      dir="rtl"
      lang="ur"
      autoComplete="off"
      spellCheck={false}
      className={cn('mandi-input font-urdu', className)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  )
}
