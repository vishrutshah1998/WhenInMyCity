'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/app/actions/notifications'
import type { ConnectionStatus, UserTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HubCreator {
  id:                    string
  username:              string
  displayName:           string
  avatarUrl:             string | null
  city:                  string
  creatorType:           string
  userTier:              UserTier
  cumulativeEventsHosted: number
  averageEventRating:    number
  bio:                   string | null
  connectionId:          string | null
  connectionStatus:      ConnectionStatus | null
  isRequester:           boolean
}

export interface HubConnection {
  connectionId:  string
  status:        ConnectionStatus
  createdAt:     string
  otherUser:     {
    id:          string
    username:    string
    displayName: string
    avatarUrl:   string | null
    city:        string
    userTier:    UserTier
    bio:         string | null
  }
  lastMessage:   { body: string; sentAt: string } | null
  unreadCount:   number
  isRequester:   boolean
}

export interface HubMessage {
  id:       string
  senderId: string
  body:     string
  sentAt:   string
  readAt:   string | null
}

export interface DiscoverCreator {
  id:           string
  username:     string
  displayName:  string
  avatarUrl:    string | null
  city:         string
  creatorType:  string
  interestTags: string[]
  userTier:     UserTier
  matchScore:   number
}

// ---------------------------------------------------------------------------
// getHubDirectory — Lantern/Beacon creators with connection state
// ---------------------------------------------------------------------------

export async function getHubDirectory(): Promise<HubCreator[]> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const [creatorsRes, connectionsRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, city, creator_type, user_tier, cumulative_events_hosted, average_event_rating, bio')
      .in('user_tier', ['lantern', 'beacon'])
      .neq('id', user.id)
      .order('user_tier', { ascending: false })
      .order('cumulative_events_hosted', { ascending: false }),
    supabase
      .from('creator_connections')
      .select('id, requester_id, recipient_id, status')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
  ])

  const creators = creatorsRes.data ?? []
  const connections = connectionsRes.data ?? []

  const connMap = new Map<string, { id: string; status: ConnectionStatus; isRequester: boolean }>()
  for (const c of connections) {
    const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
    connMap.set(otherId, { id: c.id, status: c.status as ConnectionStatus, isRequester: c.requester_id === user.id })
  }

  return creators.map((c) => {
    const conn = connMap.get(c.id)
    return {
      id:                    c.id,
      username:              c.username,
      displayName:           c.display_name,
      avatarUrl:             c.avatar_url,
      city:                  c.city,
      creatorType:           c.creator_type,
      userTier:              c.user_tier as UserTier,
      cumulativeEventsHosted: c.cumulative_events_hosted,
      averageEventRating:    c.average_event_rating,
      bio:                   c.bio,
      connectionId:          conn?.id ?? null,
      connectionStatus:      conn?.status ?? null,
      isRequester:           conn?.isRequester ?? false,
    }
  })
}

// ---------------------------------------------------------------------------
// getDiscoverCreators — city-first, then same category, scored by tag overlap
// ---------------------------------------------------------------------------

export async function getDiscoverCreators(limit = 20): Promise<DiscoverCreator[]> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: me } = await supabase
    .from('user_profiles')
    .select('city, creator_type, interest_tags')
    .eq('id', user.id)
    .single()

  if (!me) return []

  // Build exclusion set: self + anyone already in a connection
  const { data: connections } = await supabase
    .from('creator_connections')
    .select('requester_id, recipient_id')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)

  const excludeIds = new Set<string>([user.id])
  connections?.forEach((c) => {
    excludeIds.add(c.requester_id)
    excludeIds.add(c.recipient_id)
  })

  const excludeList = [...excludeIds]
  const excludeFilter = `(${excludeList.join(',')})`

  const cols = 'id, username, display_name, avatar_url, city, creator_type, interest_tags, user_tier'

  // 1. Same city first
  const { data: sameCityCreators } = await supabase
    .from('user_profiles')
    .select(cols)
    .eq('city', me.city)
    .not('id', 'in', excludeFilter)
    .limit(limit)

  let results = sameCityCreators ?? []

  // 2. Fill remainder with same creator_type from other cities
  if (results.length < limit && me.creator_type) {
    const fetched = new Set(results.map((r) => r.id))
    const allExclude = [...excludeIds, ...fetched]
    const { data: sameCatCreators } = await supabase
      .from('user_profiles')
      .select(cols)
      .eq('creator_type', me.creator_type)
      .neq('city', me.city)
      .not('id', 'in', `(${allExclude.join(',')})`)
      .limit(limit - results.length)
    results = [...results, ...(sameCatCreators ?? [])]
  }

  const myTags = new Set(me.interest_tags ?? [])

  return results
    .map((c) => ({
      id:           c.id,
      username:     c.username ?? '',
      displayName:  c.display_name ?? '',
      avatarUrl:    c.avatar_url,
      city:         c.city ?? '',
      creatorType:  c.creator_type ?? '',
      interestTags: c.interest_tags ?? [],
      userTier:     (c.user_tier ?? 'wanderer') as UserTier,
      matchScore:   (c.interest_tags ?? []).filter((t: string) => myTags.has(t)).length,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
}

// ---------------------------------------------------------------------------
// sendConnectionRequest
// ---------------------------------------------------------------------------

export async function sendConnectionRequest(recipientId: string): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase.from('creator_connections').insert({
    requester_id: user.id,
    recipient_id: recipientId,
    status: 'pending',
  })

  if (error) return { success: false, error: error.message }

  // Fire-and-forget notification
  void (async () => {
    try {
      const { data: requester } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()
      await createNotification({
        recipientId,
        type: 'connection_request',
        title: 'New connection request',
        body: `${requester?.display_name ?? requester?.username ?? 'Someone'} wants to connect with you.`,
        actionUrl: '/dashboard/hub?tab=requests',
      })
    } catch {}
  })()

  return { success: true }
}

// ---------------------------------------------------------------------------
// respondToConnection — accept or decline
// ---------------------------------------------------------------------------

export async function respondToConnection(
  connectionId: string,
  response: 'accepted' | 'declined',
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: conn } = await supabase
    .from('creator_connections')
    .select('requester_id')
    .eq('id', connectionId)
    .eq('recipient_id', user.id)
    .single()

  const { error } = await supabase
    .from('creator_connections')
    .update({ status: response, updated_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('recipient_id', user.id)

  if (error) return { success: false, error: error.message }

  if (response === 'accepted' && conn) {
    void (async () => {
      try {
        const { data: accepter } = await supabase
          .from('user_profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single()
        await createNotification({
          recipientId: conn.requester_id,
          type: 'connection_accepted',
          title: 'Connection accepted!',
          body: `${accepter?.display_name ?? accepter?.username ?? 'Someone'} accepted your connection request.`,
          actionUrl: '/dashboard/hub?tab=messages',
        })
      } catch {}
    })()
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// getConnections — all connections for current user
// ---------------------------------------------------------------------------

export async function getConnections(): Promise<HubConnection[]> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: connections } = await supabase
    .from('creator_connections')
    .select('id, requester_id, recipient_id, status, created_at')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (!connections || connections.length === 0) return []

  const otherIds = connections.map((c) =>
    c.requester_id === user.id ? c.recipient_id : c.requester_id,
  )

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, city, user_tier, bio')
    .in('id', otherIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const connectionIds = connections.map((c) => c.id)
  const { data: lastMsgs } = await supabase
    .from('creator_messages')
    .select('connection_id, body, sent_at')
    .in('connection_id', connectionIds)
    .order('sent_at', { ascending: false })

  const lastMsgMap = new Map<string, { body: string; sentAt: string }>()
  for (const m of lastMsgs ?? []) {
    if (!lastMsgMap.has(m.connection_id)) {
      lastMsgMap.set(m.connection_id, { body: m.body, sentAt: m.sent_at })
    }
  }

  const { data: unreadMsgs } = await supabase
    .from('creator_messages')
    .select('connection_id')
    .in('connection_id', connectionIds)
    .neq('sender_id', user.id)
    .is('read_at', null)

  const unreadMap = new Map<string, number>()
  for (const m of unreadMsgs ?? []) {
    unreadMap.set(m.connection_id, (unreadMap.get(m.connection_id) ?? 0) + 1)
  }

  return connections.map((c) => {
    const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
    const profile = profileMap.get(otherId)
    return {
      connectionId: c.id,
      status:       c.status as ConnectionStatus,
      createdAt:    c.created_at,
      otherUser: {
        id:          otherId,
        username:    profile?.username ?? '',
        displayName: profile?.display_name ?? '',
        avatarUrl:   profile?.avatar_url ?? null,
        city:        profile?.city ?? '',
        userTier:    (profile?.user_tier ?? 'lantern') as UserTier,
        bio:         profile?.bio ?? null,
      },
      lastMessage:  lastMsgMap.get(c.id) ?? null,
      unreadCount:  unreadMap.get(c.id) ?? 0,
      isRequester:  c.requester_id === user.id,
    }
  })
}

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

export async function sendMessage(
  connectionId: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const trimmed = body.trim()
  if (!trimmed) return { success: false, error: 'Message cannot be empty' }

  const { data: conn } = await supabase
    .from('creator_connections')
    .select('requester_id, recipient_id')
    .eq('id', connectionId)
    .eq('status', 'accepted')
    .single()

  const { error } = await supabase.from('creator_messages').insert({
    connection_id: connectionId,
    sender_id: user.id,
    body: trimmed,
  })

  if (error) return { success: false, error: error.message }

  if (conn) {
    const recipientId = conn.requester_id === user.id ? conn.recipient_id : conn.requester_id
    void (async () => {
      try {
        const { data: sender } = await supabase
          .from('user_profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single()
        await createNotification({
          recipientId,
          type: 'new_message',
          title: 'New message',
          body: `${sender?.display_name ?? sender?.username ?? 'Someone'}: ${trimmed.slice(0, 60)}${trimmed.length > 60 ? '…' : ''}`,
          actionUrl: `/dashboard/hub?tab=messages&connection=${connectionId}`,
        })
      } catch {}
    })()
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// getMessages — fetch all messages and mark unread ones as read
// ---------------------------------------------------------------------------

export async function getMessages(connectionId: string, before?: string): Promise<HubMessage[]> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  // Verify user is part of this connection and it's accepted
  const { data: connection } = await supabase
    .from('creator_connections')
    .select('requester_id, recipient_id, status')
    .eq('id', connectionId)
    .single()

  if (!connection || connection.status !== 'accepted') return []
  if (connection.requester_id !== user.id && connection.recipient_id !== user.id) return []

  // Mark messages from the other person as read
  await supabase
    .from('creator_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('connection_id', connectionId)
    .neq('sender_id', user.id)
    .is('read_at', null)

  // Fetch last 50, newest first, cursor on sent_at for pagination
  let query = supabase
    .from('creator_messages')
    .select('id, sender_id, body, sent_at, read_at')
    .eq('connection_id', connectionId)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (before) {
    query = query.lt('sent_at', before)
  }

  const { data } = await query

  // Reverse so oldest appears at top (chronological order for display)
  return (data ?? []).reverse().map((m) => ({
    id:       m.id,
    senderId: m.sender_id,
    body:     m.body,
    sentAt:   m.sent_at,
    readAt:   m.read_at,
  }))
}

// ---------------------------------------------------------------------------
// getUnreadMessageCount — for notification badge
// ---------------------------------------------------------------------------

export async function getUnreadMessageCount(): Promise<number> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: myConns } = await supabase
    .from('creator_connections')
    .select('id')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq('status', 'accepted')

  if (!myConns || myConns.length === 0) return 0

  const connIds = myConns.map((c) => c.id)

  const { count } = await supabase
    .from('creator_messages')
    .select('id', { count: 'exact', head: true })
    .in('connection_id', connIds)
    .neq('sender_id', user.id)
    .is('read_at', null)

  return count ?? 0
}
