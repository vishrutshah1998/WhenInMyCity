'use client'

import {
  createContext, useContext, useState, useEffect, useRef, useCallback,
  type ReactNode,
} from 'react'
import { useMachine } from '@xstate/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  onboardingMachine,
  type OnboardingAnswers,
  type OnboardingStep,
} from '@/lib/adda/onboarding/machine'
import type { StateFrom, EventFrom } from 'xstate'
import VenueTypeStep from '@/components/adda/onboarding/steps/VenueTypeStep'
import VenueNameStep from '@/components/adda/onboarding/steps/VenueNameStep'
import AddressStep from '@/components/adda/onboarding/steps/AddressStep'
import CapacityStep from '@/components/adda/onboarding/steps/CapacityStep'
import PricingModelStep from '@/components/adda/onboarding/steps/PricingModelStep'
import OpeningHoursStep from '@/components/adda/onboarding/steps/OpeningHoursStep'
import AmenitiesStep from '@/components/adda/onboarding/steps/AmenitiesStep'
import PhotosStep from '@/components/adda/onboarding/steps/PhotosStep'
import ReviewStep from '@/components/adda/onboarding/steps/ReviewStep'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 4 sections, each = 25% of the progress bar. Bar never retreats. */
export const SECTIONS: { label: string; steps: OnboardingStep[] }[] = [
  { label: 'About you',   steps: ['venueType', 'venueName'] },
  { label: 'Your space',  steps: ['address', 'capacity', 'pricingModel', 'openingHours'] },
  { label: 'Your listing',steps: ['amenities', 'photos', 'rulesAndPolicies'] },
  { label: 'Go live',     steps: ['bankDetails', 'review', 'complete'] },
]

const VENUE_TYPE_LABELS: Record<string, string> = {
  studio_gallery:   'studio or gallery',
  cafe:             'café or restaurant',
  rooftop_terrace:  'rooftop',
  coworking_office: 'co-working space',
  event_hall:       'event hall',
  other:            'space',
}

type QuestionFn = (answers: OnboardingAnswers) => string
const QUESTIONS: Record<OnboardingStep, string | QuestionFn> = {
  venueType:        "Hi! I'm Diya. I'll help you list your space on WIMC in about 5 minutes. First — what kind of space is this?",
  venueName:        (a) => `Great! What should creators call your ${VENUE_TYPE_LABELS[a.venueType ?? ''] ?? 'space'}? A memorable name works better than a legal name.`,
  address:          (a) => `Where is ${a.venueName ?? 'your space'}? Start typing and I'll find it.`,
  capacity:         'How many people can it comfortably host?',
  pricingModel:     'How would you like to charge for your space?',
  openingHours:     'When is it typically available for events?',
  amenities:        'What does your space have to offer?',
  photos:           'Got some great photos to show it off?',
  rulesAndPolicies: 'Any house rules or policies creators should know?',
  bankDetails:      'Almost there! Where should we send your payouts?',
  review:           "Here's how your listing looks. Ready to go live?",
  complete:         "You're live! 🎉 Welcome to the Adda community.",
}

function evaluateQuestion(step: OnboardingStep, answers: OnboardingAnswers): string {
  const q = QUESTIONS[step]
  return typeof q === 'function' ? q(answers) : q
}

/** Illustration placeholder colours per section index */
const SECTION_COLORS = [
  'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
  'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
  'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))',
  'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(16,185,129,0.08))',
]

const DRAFT_KEY      = 'adda_onboarding_draft'
const SNAPSHOT_KEY   = 'adda_onboarding_snapshot'
const TYPING_DELAY_MS = 600

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TranscriptEntry {
  id: string
  role: 'diya' | 'user'
  text: string
}

interface OnboardingContextValue {
  snapshot: StateFrom<typeof onboardingMachine>
  send: (event: EventFrom<typeof onboardingMachine>) => void
  handleAnswer: (
    questionId: keyof OnboardingAnswers,
    value: unknown,
    displayText: string,
    extras?: Partial<OnboardingAnswers>,
  ) => void
  transcript: TranscriptEntry[]
  isTyping: boolean
  isQuestionVisible: boolean
}

export const OnboardingCtx = createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingCtx)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingShell')
  return ctx
}

// ---------------------------------------------------------------------------
// Progress helpers
// ---------------------------------------------------------------------------

function getSectionIndex(step: string): number {
  return SECTIONS.findIndex(s => s.steps.includes(step as OnboardingStep))
}

function getSectionLabel(step: string): string {
  const idx = getSectionIndex(step)
  if (idx < 0) return ''
  return `Section ${idx + 1} of 4 — ${SECTIONS[idx].label}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Three-dot typing indicator — three amber dots staggered up/down */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{
            display: 'block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--adda-amber)',
          }}
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.7,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/** A single chat bubble */
function Bubble({ entry }: { entry: TranscriptEntry }) {
  const isDiya = entry.role === 'diya'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      style={{
        display: 'flex',
        justifyContent: isDiya ? 'flex-start' : 'flex-end',
        marginBottom: 10,
      }}
    >
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isDiya ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isDiya
          ? 'var(--adda-bg-elevated)'
          : 'var(--adda-amber-tint)',
        border: isDiya
          ? '1px solid var(--adda-border-subtle)'
          : '1px solid var(--adda-amber-border)',
        fontSize: 14,
        lineHeight: 1.55,
        color: isDiya ? 'var(--adda-text-secondary)' : 'var(--adda-text-primary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        {entry.text}
      </div>
    </motion.div>
  )
}

/** Resume prompt — shown when a localStorage draft is detected */
function ResumePrompt({
  venueName,
  savedAt,
  onContinue,
  onFresh,
}: {
  venueName?: string
  savedAt?: string
  onContinue: () => void
  onFresh: () => void
}) {
  const timeLabel = savedAt
    ? new Date(savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'recently'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--adda-bg-base)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'var(--adda-bg-surface)',
          border: '1px solid var(--adda-border-default)',
          borderRadius: 16,
          padding: '36px 40px',
          maxWidth: 440,
          width: '90%',
          textAlign: 'center',
        }}
      >
        {/* Amber hexagon mark */}
        <div style={{
          width: 48,
          height: 48,
          background: 'var(--adda-amber)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 20px',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#000' }}>A</span>
        </div>

        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--adda-text-primary)',
          marginBottom: 8,
          letterSpacing: '-0.01em',
        }}>
          Welcome back!
        </h2>
        <p style={{
          fontSize: 14,
          color: 'var(--adda-text-secondary)',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          You were listing{' '}
          <strong style={{ color: 'var(--adda-text-primary)' }}>
            {venueName ? `"${venueName}"` : 'your venue'}
          </strong>
          {' '}on {timeLabel}. Continue where you left off?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onContinue}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: 'var(--adda-amber)',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Continue listing
          </button>
          <button
            onClick={onFresh}
            style={{
              padding: '11px 24px',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--adda-text-muted)',
              fontWeight: 500,
              fontSize: 14,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              border: '1px solid var(--adda-border-default)',
              cursor: 'pointer',
            }}
          >
            Start fresh
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic step input placeholder
// Individual step components (VenueTypeStep, AddressStep, etc.) will replace
// this placeholder — they consume OnboardingCtx directly via useOnboarding().
// ---------------------------------------------------------------------------

function StepInputPlaceholder({ step }: { step: OnboardingStep }) {
  const { handleAnswer, snapshot } = useOnboarding()
  const [value, setValue] = useState('')

  function handleSubmit() {
    if (!value.trim() && step !== 'complete') return
    handleAnswer(
      stepToQuestionId(step),
      value.trim(),
      value.trim() || '(skipped)',
    )
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (step === 'complete') {
    return (
      <div style={{ paddingTop: 8 }}>
        <Link
          href="/adda/dashboard"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: 'var(--adda-amber)',
            color: '#000',
            fontWeight: 700,
            fontSize: 15,
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Go to my dashboard →
        </Link>
      </div>
    )
  }

  const showBack = snapshot.can({ type: 'BACK' })
  const { send } = useOnboarding()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer…"
          rows={2}
          autoFocus
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--adda-bg-elevated)',
            border: '1px solid var(--adda-border-default)',
            color: 'var(--adda-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 15,
            outline: 'none',
            resize: 'none',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            background: value.trim() ? 'var(--adda-amber)' : 'var(--adda-bg-hover)',
            color: value.trim() ? '#000' : 'var(--adda-text-muted)',
            fontWeight: 700,
            fontSize: 14,
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            border: 'none',
            cursor: value.trim() ? 'pointer' : 'default',
            transition: 'background 160ms ease, color 160ms ease',
            flexShrink: 0,
          }}
        >
          Next →
        </button>
      </div>

      {showBack && (
        <button
          onClick={() => send({ type: 'BACK' })}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Go back
        </button>
      )}
    </div>
  )
}

// Maps machine state name to the OnboardingAnswers key for that step.
// Replace this with step-specific logic when building individual input components.
function stepToQuestionId(step: OnboardingStep): keyof OnboardingAnswers {
  const map: Record<OnboardingStep, keyof OnboardingAnswers> = {
    venueType:       'venueType',
    venueName:       'venueName',
    address:         'address',
    capacity:        'capacityMax',
    pricingModel:    'pricingModel',
    openingHours:    'openingHours',
    amenities:       'amenities',
    photos:          'photos',
    rulesAndPolicies:'houseRules',
    bankDetails:     'bankName',
    review:          'venueName', // no-op for review
    complete:        'venueName', // no-op
  }
  return map[step]
}

// ---------------------------------------------------------------------------
// ActiveShell — the running machine + conversation UI
// Only mounted after the user has decided (continue vs fresh).
// ---------------------------------------------------------------------------

interface ActiveShellProps {
  persistedSnapshot?: unknown
}

function ActiveShell({ persistedSnapshot }: ActiveShellProps) {
  const [machineSnapshot, send, actorRef] = useMachine(onboardingMachine, {
    snapshot: persistedSnapshot as Parameters<typeof useMachine>[1] extends { snapshot?: infer S } ? S : never,
  })

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isTyping, setIsTyping] = useState(true)
  const [isQuestionVisible, setIsQuestionVisible] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const prevStepRef = useRef<string>('')
  const maxProgressRef = useRef(0)
  const isFirstRenderRef = useRef(true)

  const currentStep = String(machineSnapshot.value) as OnboardingStep
  const sectionIndex = getSectionIndex(currentStep)
  const rawProgress = sectionIndex * 25

  // Progress bar never retreats
  useEffect(() => {
    if (rawProgress > maxProgressRef.current) {
      maxProgressRef.current = rawProgress
    }
  }, [rawProgress])

  const displayProgress = Math.max(rawProgress, maxProgressRef.current)

  // Persist full machine snapshot on every state change (for genuine resume)
  useEffect(() => {
    try {
      const snapshot = actorRef.getPersistedSnapshot()
      const venueName = machineSnapshot.context.answers.venueName
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        venueName,
        savedAt: new Date().toISOString(),
      }))
    } catch { /* storage quota — non-fatal */ }
  }, [machineSnapshot.value, machineSnapshot.context.answers])

  // Typing indicator → question reveal flow
  useEffect(() => {
    if (prevStepRef.current === currentStep && !isFirstRenderRef.current) return

    isFirstRenderRef.current = false
    prevStepRef.current = currentStep

    setIsTyping(true)
    setIsQuestionVisible(false)

    const timer = setTimeout(() => {
      setIsTyping(false)
      setIsQuestionVisible(true)
    }, TYPING_DELAY_MS)

    return () => clearTimeout(timer)
  }, [currentStep])

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [transcript, isTyping])

  // Called by each step input when the user submits an answer
  const handleAnswer = useCallback((
    questionId: keyof OnboardingAnswers,
    value: unknown,
    displayText: string,
    extras?: Partial<OnboardingAnswers>,
  ) => {
    const q = evaluateQuestion(currentStep, machineSnapshot.context.answers)
    setTranscript(prev => [
      ...prev,
      { id: `diya-${currentStep}-${Date.now()}`, role: 'diya', text: q },
      { id: `user-${currentStep}-${Date.now()}`, role: 'user', text: displayText },
    ])
    send({ type: 'NEXT', questionId, value, displayText, extras })
  }, [currentStep, send, machineSnapshot.context.answers])

  const ctxValue: OnboardingContextValue = {
    snapshot: machineSnapshot,
    send,
    handleAnswer,
    transcript,
    isTyping,
    isQuestionVisible,
  }

  return (
    <OnboardingCtx.Provider value={ctxValue}>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--adda-bg-base)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: 'var(--adda-text-primary)',
      }}>

        {/* ── Left panel: conversation (45%) ──────────────────────────────── */}
        <div style={{
          flex: '0 0 45%',
          maxWidth: '45%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRight: '1px solid var(--adda-border-subtle)',
        }}>

          {/* Section-based progress bar — 4px, full width, transition never backward */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '45%',
            height: 4,
            background: 'var(--adda-bg-overlay)',
            zIndex: 60,
          }}>
            <div style={{
              height: '100%',
              background: 'var(--adda-amber)',
              width: `${displayProgress}%`,
              transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '0 2px 2px 0',
            }} />
          </div>

          {/* Inner scroll container */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '28px 36px 24px',
            paddingTop: 20,
            overflowY: 'auto',
          }}>

            {/* Logo + section label row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 12 }}>
              <Link href="/adda" style={{ textDecoration: 'none' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  background: 'var(--adda-amber)',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  display: 'grid',
                  placeItems: 'center',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#000' }}>A</span>
                </div>
              </Link>

              <span style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--adda-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}>
                {getSectionLabel(currentStep)}
              </span>
            </div>

            {/* Diya avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--adda-amber), var(--adda-amber-hover))',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 16,
                color: '#000',
                flexShrink: 0,
              }}>
                D
              </div>
              <span style={{
                fontSize: 11,
                color: 'var(--adda-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}>
                Diya
              </span>
            </div>

            {/* Conversation transcript — past exchanges */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 8 }}>
              <AnimatePresence mode="sync">
                {transcript.map(entry => (
                  <Bubble key={entry.id} entry={entry} />
                ))}
              </AnimatePresence>
              <div ref={transcriptEndRef} />
            </div>

            {/* Typing indicator (animated dots, 600ms before question) */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: 'inline-flex',
                    background: 'var(--adda-bg-elevated)',
                    border: '1px solid var(--adda-border-subtle)',
                    borderRadius: '4px 14px 14px 14px',
                    marginBottom: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current question + step input */}
            <AnimatePresence>
              {isQuestionVisible && (
                <motion.div
                  key={`question-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ paddingBottom: 24 }}
                >
                  {/* Diya's question text — 22px medium weight */}
                  <p style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: 'var(--adda-text-primary)',
                    lineHeight: 1.45,
                    marginBottom: 20,
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                  }}>
                    {evaluateQuestion(currentStep, machineSnapshot.context.answers)}
                  </p>

                  {currentStep === 'venueType'    && <VenueTypeStep />}
                  {currentStep === 'venueName'    && <VenueNameStep />}
                  {currentStep === 'address'      && <AddressStep />}
                  {currentStep === 'capacity'     && <CapacityStep />}
                  {currentStep === 'pricingModel' && <PricingModelStep />}
                  {currentStep === 'openingHours' && <OpeningHoursStep />}
                  {currentStep === 'amenities'    && <AmenitiesStep />}
                  {currentStep === 'photos'       && <PhotosStep />}
                  {currentStep === 'review'       && <ReviewStep />}
                  {currentStep !== 'venueType' && currentStep !== 'venueName' && currentStep !== 'address' &&
                   currentStep !== 'capacity' && currentStep !== 'pricingModel' && currentStep !== 'openingHours' &&
                   currentStep !== 'amenities' && currentStep !== 'photos' && currentStep !== 'review' && (
                    <StepInputPlaceholder step={currentStep} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right panel: contextual illustration (55%) ───────────────────
            Hidden on mobile (≤768px) via media query below.
            Replace colored divs with actual SVG illustrations per step. */}
        <div
          className="adda-onboard-illustration"
          style={{
            flex: '0 0 55%',
            maxWidth: '55%',
            background: SECTION_COLORS[Math.max(sectionIndex, 0)],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Step name watermark — placeholder until illustrations are added */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              padding: '24px 32px',
              borderRadius: 16,
              border: '1px dashed var(--adda-border-default)',
              textAlign: 'center',
            }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
            }}>
              Illustration: {currentStep}
            </span>
          </motion.div>
        </div>

      </div>

      {/* Responsive: hide illustration panel on mobile */}
      <style>{`
        @media (max-width: 767px) {
          .adda-onboard-illustration { display: none !important; }
          div[style*="flex: 0 0 45%"] { flex: 0 0 100% !important; max-width: 100% !important; }
          div[style*="width: 45%"] { width: 100% !important; }
        }
      `}</style>
    </OnboardingCtx.Provider>
  )
}

// ---------------------------------------------------------------------------
// OnboardingShell — outer component
// Handles localStorage check → resume dialog → ActiveShell mounting.
// ---------------------------------------------------------------------------

export default function OnboardingShell() {
  type ResumeData = { venueName?: string; savedAt?: string }

  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)
  const [persistedSnapshot, setPersistedSnapshot] = useState<unknown>(undefined)
  const [shouldResume, setShouldResume] = useState(false)

  // Check localStorage only after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      const snapshot = localStorage.getItem(SNAPSHOT_KEY)

      if (draft && snapshot) {
        const { venueName, savedAt } = JSON.parse(draft) as ResumeData
        const parsed = JSON.parse(snapshot)
        setResumeData({ venueName, savedAt })
        setPersistedSnapshot(parsed)
      }
    } catch { /* bad localStorage data — ignore */ }

    setHasCheckedStorage(true)
  }, [])

  // Don't render until we've checked storage (prevents SSR/hydration flash)
  if (!hasCheckedStorage) return null

  // Show resume prompt if we have a draft and user hasn't chosen yet
  if (resumeData && !shouldResume && persistedSnapshot) {
    return (
      <ResumePrompt
        venueName={resumeData.venueName}
        savedAt={resumeData.savedAt}
        onContinue={() => setShouldResume(true)}
        onFresh={() => {
          try {
            localStorage.removeItem(DRAFT_KEY)
            localStorage.removeItem(SNAPSHOT_KEY)
            localStorage.removeItem('adda_onboarding_draft_answers')
          } catch { /* ignore */ }
          setResumeData(null)
          setPersistedSnapshot(undefined)
          setHasCheckedStorage(true) // re-render without resume dialog
        }}
      />
    )
  }

  return (
    <div className="adda-theme">
      <ActiveShell
        persistedSnapshot={shouldResume ? persistedSnapshot : undefined}
      />
    </div>
  )
}
