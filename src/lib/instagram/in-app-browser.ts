/**
 * Detects Instagram's and Facebook's in-app WebView browsers (FBAN/FBAV are
 * Facebook's app tokens; Instagram's own in-app browser also identifies as
 * "Instagram" in its UA string). These WebViews are documented to block or
 * silently no-op window.open(), so the OAuth popup path is skipped entirely
 * for them in favor of the existing full-page redirect.
 */
export function isInAppBrowser(userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /FBAN|FBAV|Instagram/i.test(userAgent)
}
