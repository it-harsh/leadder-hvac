'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'

interface PricingCellProps {
  price: number | null
  capacityId: string
  tier: 'good' | 'better' | 'best'
  disabled?: boolean
  onChange: (capacityId: string, tier: 'good' | 'better' | 'best', price: number | null) => void
}

export function PricingCell({
  price,
  capacityId,
  tier,
  disabled = false,
  onChange
}: PricingCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(price?.toString() || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setValue(price?.toString() || '')
  }, [price])

  const handleClick = () => {
    if (disabled) return
    setIsEditing(true)
    setValue(price?.toString() || '')
  }

  const validatePrice = (val: string): number | null => {
    if (!val || val.trim() === '') return null
    
    const num = parseFloat(val)
    
    // Validation rules
    if (isNaN(num)) return null
    if (num < 0) return null
    if (num > 999999.99) return null
    
    // Round to 2 decimals
    return Math.round(num * 100) / 100
  }

  const handleApply = () => {
    const validatedPrice = validatePrice(value)
    if (validatedPrice !== price) {
      onChange(capacityId, tier, validatedPrice)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    } else if (e.key === 'Escape') {
      setValue(price?.toString() || '')
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    handleApply()
  }

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => {
              setValue(e.target.value)
              onChange(capacityId, tier, validatePrice(e.target.value))
            }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full px-2 py-1 text-center text-lg font-semibold border-2 border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="0.00"
          step="0.01"
          min="0"
          max="999999.99"
        />
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`group relative w-full px-2 py-2 text-center rounded transition-all border ${
        disabled
          ? 'cursor-not-allowed border-transparent'
          : price !== null
            ? 'border-transparent hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
            : 'border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
      }`}
    >
      {price !== null ? (
        <>
          <span className="text-lg font-semibold text-foreground">
            ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {!disabled && (
            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </>
      ) : (
        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
          + Set price
        </span>
      )}
    </button>
  )
}
