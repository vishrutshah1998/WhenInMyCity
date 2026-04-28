'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
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
}

export interface HubMessage {
  id:       string
  senderId: string
  body:     string
  sentAt:   string
  readAt:   string | null
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

  const { error } = await supabase
    .from('creator_connections')
    .update({ status: response, updated_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('recipient_id', user.id)

  if (error) return { success: false, error: error.message }
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

  const { error } = await supabase.from('creator_messages').insert({
    connection_id: connectionId,
    sender_id: user.id,
    body: trimmed,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// getMessages — fetch all messages and mark unread ones as read
// ---------------------------------------------------------------------------

export async function getMessages(connectionId: string): Promise<HubMessage[]> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('creator_messages')
    .select('id, sender_id, body, sent_at, read_at')
    .eq('connection_id', connectionId)
    .order('sent_at', { ascending: true })

  if (!messages || messages.length === 0) return []

  const unreadIds = messages
    .filter((m) => m.sender_id !== user.id && !m.read_at)
    .map((m) => m.id)

  if (unreadIds.length > 0) {
    await supabase
      .from('creator_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return messages.map((m) => ({
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
