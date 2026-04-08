const TON_TO_SQFT: Record<string, string> = {
  '1':   '500 – 700',
  '1.5': '750 – 900',
  '2':   '1,000 – 1,200',
  '2.5': '1,250 – 1,500',
  '3':   '1,500 – 1,800',
  '3.5': '1,750 – 2,100',
  '4':   '2,000 – 2,400',
  '5':   '2,500 – 3,000',
}

// Furnace / boiler BTU output → sq ft coverage
const BTU_TO_SQFT: Record<string, string> = {
  '40000':  '1,000 – 1,200',
  '60000':  '1,500 – 1,800',
  '80000':  '2,000 – 2,400',
  '100000': '2,500 – 3,000',
  '120000': '3,000 – 3,600',
}

export function getSqftRange(value: string, unit: string): string | null {
  const u = unit.toLowerCase()
  if (u.includes('sq')) return `${value} ${unit}`
  if (u === 'ton' || u === 'tons') return TON_TO_SQFT[value.trim()] ?? null
  if (u === 'btu' || u === 'btuh') return BTU_TO_SQFT[value.trim()] ?? null
  return null
}
