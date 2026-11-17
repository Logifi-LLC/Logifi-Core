/** Default off so web Apple stays hidden until the Services ID + Supabase provider are live. */
export function isAppleWebSignInEnabled(flag = ''): boolean {
  const value = flag.trim().toLowerCase()
  return value === 'true' || value === '1' || value === 'on'
}

export function readAppleWebSignInFlag(): string {
  try {
    const config = useRuntimeConfig()
    return String(config.public.appleWebSignIn ?? '')
  } catch {
    return ''
  }
}

export function isAppleWebOAuthAvailable(): boolean {
  return isAppleWebSignInEnabled(readAppleWebSignInFlag())
}
