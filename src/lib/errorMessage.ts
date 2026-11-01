/** The message of a caught value. `catch (e)` is `unknown`, so look before reading `.message`. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return String(e)
}
