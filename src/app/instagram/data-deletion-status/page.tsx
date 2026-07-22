import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Deletion Status | When In My City',
}

// Linked from the { url, confirmation_code } response our
// /api/instagram/data-deletion route gives back to Meta's Data Deletion
// Request callback. Deletion there is synchronous, so this page has
// nothing left to check for — it always confirms completion.
export default async function DataDeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Data deletion complete</h1>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333' }}>
        Your Instagram connection and any data When In My City stored from it (access token and
        cached post thumbnails) have been deleted.
      </p>
      {id && (
        <p style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
          Confirmation code: {id}
        </p>
      )}
    </main>
  )
}
