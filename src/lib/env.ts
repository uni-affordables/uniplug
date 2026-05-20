const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const readBooleanEnv = (
  name: string,
  defaultValue = false
): boolean => {
  const rawValue = process.env[name]

  if (rawValue == null) {
    return defaultValue
  }

  return TRUE_VALUES.has(rawValue.trim().toLowerCase())
}

export const isUnplugAllowed = (): boolean => readBooleanEnv('ALLOW_USE', false)
