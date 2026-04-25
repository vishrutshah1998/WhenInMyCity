import { setup, assign } from 'xstate'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Venue types that trigger food-service amenity flags (servesBeer, servesWine, etc.)
 * when the user reaches the amenities step.
 */
export const FOOD_VENUE_TYPES = ['cafe', 'restaurant'] as const
export type FoodVenueType = (typeof FOOD_VENUE_TYPES)[number]

export type OnboardingStep =
  | 'venueType'
  | 'venueName'
  | 'address'
  | 'capacity'
  | 'pricingModel'
  | 'openingHours'
  | 'amenities'
  | 'photos'
  | 'rulesAndPolicies'
  | 'bankDetails'
  | 'review'
  | 'complete'

export interface OnboardingAnswers {
  venueType?: string                             // from VALID_ADDA_TYPES
  venueName?: string
  description?: string
  address?: string
  neighbourhood?: string
  city?: string
  state?: string
  pincode?: string
  lat?: number
  lng?: number
  googlePlaceId?: string
  googleName?: string
  phone?: string
  website?: string
  existingRating?: number
  capacityMin?: number
  capacityMax?: number
  pricingModel?: 'hourly' | 'daily' | 'hourly_minimum'
  pricingConfig?: Record<string, number>
  openingHours?: Record<string, { open: string; close: string; closed: boolean }>
  amenities?: string[]
  servesBeer?: boolean
  servesWine?: boolean
  servesCocktails?: boolean
  servesFood?: boolean
  photos?: string[]
  houseRules?: string
  cancellationPolicy?: string
  accountHolderName?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  upiId?: string
}

interface OnboardingContext {
  answers: OnboardingAnswers
  draft: {
    savedAt: string | null
    resumeToken: string | null
  }
}

type NextEvent = {
  type: 'NEXT'
  questionId: keyof OnboardingAnswers
  value: unknown
  displayText?: string
  extras?: Partial<OnboardingAnswers>
}

type BackToEvent = { type: 'BACK_TO'; target: OnboardingStep }
type OnboardingEvent = NextEvent | { type: 'BACK' } | BackToEvent

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const onboardingMachine = setup({
  types: {
    context: {} as OnboardingContext,
    events: {} as OnboardingEvent,
  },
  actions: {
    /**
     * Merges the event's answer into context.answers.
     * Runs on every NEXT transition — the action that accumulates the draft.
     */
    saveAnswer: assign(({ context, event }) => {
      if (event.type !== 'NEXT') return {}
      return {
        answers: {
          ...context.answers,
          ...(event.extras ?? {}),
          [event.questionId]: event.value,
        } as OnboardingAnswers,
      }
    }),

    /**
     * localStorage service — fires on every NEXT transition after saveAnswer.
     * Serialises context.answers and the current draft timestamp.
     * State-machine snapshot persistence (for full resume) is handled separately
     * in the React shell via actorRef.getPersistedSnapshot().
     */
    persistDraft: assign(({ context }) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'adda_onboarding_draft_answers',
            JSON.stringify({
              answers: context.answers,
              savedAt: new Date().toISOString(),
            }),
          )
        } catch {
          /* storage quota exceeded — non-fatal */
        }
      }
      return {
        draft: {
          savedAt: new Date().toISOString(),
          resumeToken: null,
        },
      }
    }),
  },

  guards: {
    /**
     * True when the selected venue type enables food-service amenity flags
     * (servesBeer, servesWine, servesCocktails, servesFood).
     * Used in the Amenities step component to conditionally render these options.
     */
    isFoodVenue: ({ context }) =>
      FOOD_VENUE_TYPES.includes(
        (context.answers.venueType ?? '') as FoodVenueType,
      ),
  },
}).createMachine({
  id: 'addaOnboarding',
  initial: 'venueType',

  context: {
    answers: {},
    draft: {
      savedAt: null,
      resumeToken: null,
    },
  },

  // ── States ──────────────────────────────────────────────────────────────
  states: {
    // ── Section 1: About you ─────────────────────────────────────────────
    venueType: {
      on: {
        NEXT: {
          target: 'venueName',
          actions: ['saveAnswer', 'persistDraft'],
        },
      },
    },

    venueName: {
      on: {
        NEXT: {
          target: 'address',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'venueType' },
      },
    },

    // ── Section 2: Your space ─────────────────────────────────────────────
    address: {
      on: {
        NEXT: {
          target: 'capacity',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'venueName' },
      },
    },

    capacity: {
      on: {
        NEXT: {
          target: 'pricingModel',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'address' },
      },
    },

    pricingModel: {
      on: {
        NEXT: {
          target: 'openingHours',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'capacity' },
      },
    },

    openingHours: {
      on: {
        NEXT: {
          target: 'amenities',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'pricingModel' },
      },
    },

    // ── Section 3: Your listing ───────────────────────────────────────────
    // Guard `isFoodVenue` is available here for the step component to read;
    // the state itself is unconditional — branching lives in the UI layer.
    amenities: {
      on: {
        NEXT: {
          target: 'photos',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'openingHours' },
      },
    },

    photos: {
      on: {
        NEXT: {
          target: 'rulesAndPolicies',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'amenities' },
      },
    },

    rulesAndPolicies: {
      on: {
        NEXT: {
          target: 'bankDetails',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'photos' },
      },
    },

    // ── Section 4: Go live ────────────────────────────────────────────────
    bankDetails: {
      on: {
        NEXT: {
          target: 'review',
          actions: ['saveAnswer', 'persistDraft'],
        },
        BACK: { target: 'rulesAndPolicies' },
      },
    },

    review: {
      on: {
        NEXT: { target: 'complete' },
        BACK: { target: 'bankDetails' },
        BACK_TO: [
          { guard: ({ event }) => event.target === 'venueName',    target: 'venueName'    },
          { guard: ({ event }) => event.target === 'address',      target: 'address'      },
          { guard: ({ event }) => event.target === 'capacity',     target: 'capacity'     },
          { guard: ({ event }) => event.target === 'pricingModel', target: 'pricingModel' },
          { guard: ({ event }) => event.target === 'openingHours', target: 'openingHours' },
          { guard: ({ event }) => event.target === 'amenities',    target: 'amenities'    },
          { guard: ({ event }) => event.target === 'photos',       target: 'photos'       },
        ],
      },
    },

    complete: {
      type: 'final',
    },
  },
})

// ---------------------------------------------------------------------------
// Exported types (consumed by shell + step components)
// ---------------------------------------------------------------------------
export type { OnboardingContext, OnboardingEvent, NextEvent, BackToEvent }
