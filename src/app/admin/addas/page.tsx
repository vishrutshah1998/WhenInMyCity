import { getAdminAddas } from '@/app/actions/admin'
import AddasClient from './AddasClient'

export default async function AdminAddasPage() {
  const { data: addas, error } = await getAdminAddas()

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return <AddasClient addas={addas ?? []} />
}
