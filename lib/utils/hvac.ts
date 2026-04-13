const TON_TO_SQFT: Record<string, string> = {
  '1':   '400 – 600',
  '1.5': '600 – 900',
  '2':   '900 – 1,200',
  '2.5': '1,200 – 1,500',
  '3':   '1,500 – 1,800',
  '3.5': '1,800 – 2,100',
  '4':   '2,000 – 2,400',
  '5':   '2,400 – 3,000',
}

// Furnace / boiler BTU output → sq ft coverage
const BTU_TO_SQFT: Record<string, string> = {
  '40000':  '500 – 1,000',
  '60000':  '1,000 – 1,500',
  '80000':  '1,500 – 2,000',
  '100000': '2,000 – 2,500',
  '120000': '2,500 – 3,000',
}

export function getSqftRange(value: string, unit: string): string | null {
  const u = unit.toLowerCase()
  if (u.includes('sq')) return `${value} ${unit}`
  if (u === 'ton' || u === 'tons') return TON_TO_SQFT[value.trim()] ?? null
  if (u === 'btu' || u === 'btuh') return BTU_TO_SQFT[value.trim()] ?? null
  return null
}
