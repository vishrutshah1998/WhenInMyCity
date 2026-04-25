/**
 * Fetches the og:image thumbnail for an Instagram post URL.
 * Uses Facebook's crawler User-Agent which Instagram serves OG tags to.
 * Returns null on any error or timeout.
 */
export async function fetchInstagramThumbnail(postUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(postUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
      next: { revalidate: 3600 },
    })

    clearTimeout(timeout)

    const html = await res.text()
    const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}
