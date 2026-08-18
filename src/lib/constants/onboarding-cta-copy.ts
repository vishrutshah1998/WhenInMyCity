// Idle/enabled-state primary CTA copy for onboarding screens. Loading states
// (Saving…, Building…, Importing…) and not-ready fallbacks not listed here
// (e.g. "Pick N more") stay inline at the call site.
export const ONBOARDING_CTA = {
  C2: "Let's build this →",
  C3: 'Keep going →',
  C4: 'Looking sharp →',
  C5: { base: 'Lock in', withCount: (n: number) => `Lock in (${n})` },
  C6: { base: 'Save these', withCount: (n: number) => `Save these (${n})` },
  C7: { withCount: (n: number) => `Light it up (${n})` },
  E2: "I'm in →",
  E3: 'Sounds right →',
  E4: "That's me →",
  E5: { withCount: (n: number) => `These are mine (${n})` },
  E5b: 'Onward →',
  E6: 'Almost there →',
  B2: 'Next up →',
  B3: 'Sounds good →',
  R1: 'Keep going →',
  R3: 'Almost there →',
  R4: 'One more thing →',
  V4: { base: 'Good picks →', withCount: (n: number) => `Good picks (${n}) →` },
  VC: 'Sounds right →',
  V7: 'Almost done →',
} as const
