export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function passwordStrength(password: string): 'weak' | 'medium' | 'strong' | null {
  if (password.length === 0) return null
  if (password.length < 6) return 'weak'
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const score = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length
  if (password.length >= 10 && score >= 3) return 'strong'
  if (password.length >= 8 && score >= 2) return 'medium'
  return 'weak'
}

export function calculateAge(birthday: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const m = today.getMonth() - birthday.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age--
  return age
}
