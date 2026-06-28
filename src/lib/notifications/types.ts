export const NOTIFICATION_META: Record<string, { icon: string; color: string; label: string }> = {
  // Tier
  tier_upgrade:               { icon: 'workspace_premium',  color: '#4ADE80', label: 'Tier Upgrade'      },
  tier_downgrade:             { icon: 'trending_down',       color: '#F472B6', label: 'Tier Update'       },
  // Events / RSVPs
  new_rsvp:                   { icon: 'confirmation_number', color: '#E8705A', label: 'New RSVP'          },
  event_rsvp:                 { icon: 'confirmation_number', color: '#22c55e', label: 'Ticket Sold'       },
  event_reminder:             { icon: 'alarm',               color: '#9B8FFF', label: 'Event Reminder'    },
  followed_maker_new_event:   { icon: 'event',               color: '#E8705A', label: 'New Event'         },
  recommended_event_nearby:   { icon: 'location_on',         color: '#3b82f6', label: 'Nearby Event'      },
  creator_post:               { icon: 'article',             color: '#E8705A', label: 'New Post'          },
  // People
  new_follower:               { icon: 'person_add',          color: '#9B8FFF', label: 'New Follower'      },
  new_booking_inquiry:        { icon: 'mail',                color: '#F5A800', label: 'Booking Inquiry'   },
  // Payouts
  payout_approved:            { icon: 'payments',            color: '#4ADE80', label: 'Payout Approved'   },
  payout_rejected:            { icon: 'money_off',           color: '#F472B6', label: 'Payout Rejected'   },
  payment_settled:            { icon: 'payments',            color: '#22c55e', label: 'Payment Settled'   },
  // Venue / Proposals
  new_proposal:               { icon: 'handshake',           color: '#5DD9D0', label: 'New Proposal'      },
  proposal_accepted:          { icon: 'check_circle',        color: '#4ADE80', label: 'Proposal Accepted' },
  proposal_counter:           { icon: 'sync_alt',            color: '#F5A800', label: 'Counter Offer'     },
  proposal_response:          { icon: 'apartment',           color: '#3b82f6', label: 'Proposal Update'   },
  event_confirmed:            { icon: 'check_circle',        color: '#22c55e', label: 'Event Confirmed'   },
  // Ratings
  rating_prompt:              { icon: 'star',                color: '#F5A800', label: 'Rate Event'        },
  new_rating:                 { icon: 'reviews',             color: '#F5A800', label: 'New Review'        },
  // Adda-specific
  adda_new_proposal:          { icon: 'handshake',           color: '#5DD9D0', label: 'New Proposal'      },
  adda_proposal_accepted:     { icon: 'check_circle',        color: '#4ADE80', label: 'Booking Confirmed' },
  adda_proposal_counter:      { icon: 'sync_alt',            color: '#F5A800', label: 'Counter Offer'     },
  adda_event_confirmed:       { icon: 'event_available',     color: '#4ADE80', label: 'Event Confirmed'   },
  adda_new_rating:            { icon: 'star',                color: '#F5A800', label: 'New Rating'        },
  adda_new_review:            { icon: 'reviews',             color: '#F5A800', label: 'New Review'        },
  adda_booking_reminder:      { icon: 'alarm',               color: '#9B8FFF', label: 'Upcoming Booking'  },
  adda_payout_processed:      { icon: 'payments',            color: '#4ADE80', label: 'Payout Processed'  },
  adda_new_inquiry:           { icon: 'mail',                color: '#E8705A', label: 'New Inquiry'       },
  adda_space_trending:        { icon: 'trending_up',         color: '#5DD9D0', label: 'Space Trending'    },
  // Hub / Connections
  connection_request:         { icon: 'person_add',          color: '#5DD9D0', label: 'Connection Request' },
  connection_accepted:        { icon: 'handshake',           color: '#4ADE80', label: 'Connection Accepted' },
  new_message:                { icon: 'chat_bubble',         color: '#9B8FFF', label: 'New Message'        },
}

export type NotificationType = keyof typeof NOTIFICATION_META
