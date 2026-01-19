// Only keeping chart-specific configuration or static metadata
export const mockRevenueData = [
  { name: 'Mon', value: 2400 },
  { name: 'Tue', value: 1398 },
  { name: 'Wed', value: 9800 },
  { name: 'Thu', value: 3908 },
  { name: 'Fri', value: 4800 },
  { name: 'Sat', value: 3800 },
  { name: 'Sun', value: 4300 },
];

export const TREATMENT_CATEGORIES = [
  'Preventative',
  'Restorative',
  'Cosmetic',
  'Surgery',
  'Orthodontics'
] as const;
