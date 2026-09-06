export const DOCTOR_SPECIALTIES = [
  'طب الأطفال',
  'طب الأسنان',
  'الطب النفسي',
  'طب جراحة القلب والأوعية الدموية',
  'الطب العام',
  'طب العيون',
  'طب المخ والأعصاب',
  'الباطنة والجهاز الهضمي',
  'نساء وتوليد',
  'مسالك بولية',
  'طب العظام',
  'طب الأورام',
  'طب جراحات التجميل',
  'الأمراض الجلدية',
  'أمراض الغدد',
  'طب أنف وأذن وحنجرة',
] as const

export function matchSpecialty(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ''
  const exact = DOCTOR_SPECIALTIES.find((item) => item === normalized)
  if (exact) return exact
  return DOCTOR_SPECIALTIES.find((item) => item.includes(normalized) || normalized.includes(item)) ?? normalized
}
