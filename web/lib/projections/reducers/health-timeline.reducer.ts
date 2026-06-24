// =============================================
// Health Timeline Reducer (Pure Function)
// Handles: HEALTH_RECORDED, SYMPTOM_LOGGED, MEDICATION_ADDED
// Output: per-pet timeline with current state
// =============================================

import type { ProjectionEvent, ProjectionReducer } from "../projection-registry"

export interface TimelineEntry {
  id: string
  type: string
  timestamp: string
  data: Record<string, unknown>
}

export interface PetHealthState {
  timeline: TimelineEntry[]
  currentState: string
  lastSymptom: string | null
  lastMedication: string | null
  reviewCount: number
}

export interface HealthTimelineProjection {
  pets: Record<string, PetHealthState>
  lastUpdated: string | null
}

const INITIAL_STATE: HealthTimelineProjection = {
  pets: {},
  lastUpdated: null,
}

function createDefaultPetState(): PetHealthState {
  return {
    timeline: [],
    currentState: "healthy",
    lastSymptom: null,
    lastMedication: null,
    reviewCount: 0,
  }
}

export const healthTimelineReducer: ProjectionReducer<HealthTimelineProjection> = (
  state: HealthTimelineProjection | undefined,
  event: ProjectionEvent
): HealthTimelineProjection => {
  const s = state ?? INITIAL_STATE
  const petId = (event.payload.pet_id as string) ?? event.aggregateId
  const pet = s.pets[petId] ?? createDefaultPetState()

  switch (event.type) {
    case "ReviewCreated": {
      const entry: TimelineEntry = {
        id: event.id,
        type: "review",
        timestamp: event.timestamp,
        data: event.payload,
      }

      return {
        ...s,
        pets: {
          ...s.pets,
          [petId]: {
            ...pet,
            timeline: [...pet.timeline.slice(-99), entry], // Keep last 100 entries
            reviewCount: pet.reviewCount + 1,
          },
        },
        lastUpdated: event.timestamp,
      }
    }

    case "ReviewUpdated": {
      // Update existing timeline entry if found
      const existingIdx = pet.timeline.findIndex(e => e.id === event.id)
      if (existingIdx >= 0) {
        const updatedTimeline = [...pet.timeline]
        updatedTimeline[existingIdx] = {
          ...updatedTimeline[existingIdx],
          data: event.payload,
        }

        return {
          ...s,
          pets: {
            ...s.pets,
            [petId]: {
              ...pet,
              timeline: updatedTimeline,
            },
          },
          lastUpdated: event.timestamp,
        }
      }

      return s
    }

    case "TimelineEventCreated": {
      const eventType = (event.payload.event_type as string) ?? "unknown"
      const entry: TimelineEntry = {
        id: event.id,
        type: eventType,
        timestamp: event.timestamp,
        data: event.payload,
      }

      let newState = pet.currentState
      if (eventType.includes("symptom")) {
        newState = "symptomatic"
      } else if (eventType.includes("recovery")) {
        newState = "recovering"
      }

      return {
        ...s,
        pets: {
          ...s.pets,
          [petId]: {
            ...pet,
            timeline: [...pet.timeline.slice(-99), entry],
            currentState: newState,
            lastSymptom: eventType.includes("symptom") ? event.timestamp : pet.lastSymptom,
          },
        },
        lastUpdated: event.timestamp,
      }
    }

    default:
      return s
  }
}
