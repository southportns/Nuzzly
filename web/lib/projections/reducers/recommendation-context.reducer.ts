// =============================================
// Recommendation Context Reducer (Pure Function)
// Handles: REVIEW events, BANDIT_REWARD
// Output: aggregated recommendation context per product/pet
// =============================================

import type { ProjectionEvent, ProjectionReducer } from "../projection-registry"

export interface ProductSignal {
  reviewCount: number
  avgRating: number
  totalRewards: number
  lastReviewed: string | null
  sentimentScore: number
}

export interface PetPreference {
  preferredBrands: Record<string, number>
  avoidedIngredients: string[]
  stomachHealthScore: number
  lastRecommendation: string | null
}

export interface RecommendationContextProjection {
  products: Record<string, ProductSignal>
  pets: Record<string, PetPreference>
  lastUpdated: string | null
}

const INITIAL_STATE: RecommendationContextProjection = {
  products: {},
  pets: {},
  lastUpdated: null,
}

function createDefaultProductSignal(): ProductSignal {
  return {
    reviewCount: 0,
    avgRating: 0,
    totalRewards: 0,
    lastReviewed: null,
    sentimentScore: 0,
  }
}

function createDefaultPetPreference(): PetPreference {
  return {
    preferredBrands: {},
    avoidedIngredients: [],
    stomachHealthScore: 0.5,
    lastRecommendation: null,
  }
}

export const recommendationContextReducer: ProjectionReducer<RecommendationContextProjection> = (
  state: RecommendationContextProjection | undefined,
  event: ProjectionEvent
): RecommendationContextProjection => {
  const s = state ?? INITIAL_STATE

  switch (event.type) {
    case "ReviewCreated": {
      const productId = (event.payload.product_id as string) ?? event.aggregateId
      const petId = (event.payload.pet_id as string)
      const rating = (event.payload.overall_rating as number) ?? 0
      const sentiment = (event.payload.sentiment_score as number) ?? 0

      // Update product signal
      const product = s.products[productId] ?? createDefaultProductSignal()
      const newReviewCount = product.reviewCount + 1
      const newAvgRating = ((product.avgRating * product.reviewCount) + rating) / newReviewCount

      const updatedProducts = {
        ...s.products,
        [productId]: {
          ...product,
          reviewCount: newReviewCount,
          avgRating: newAvgRating,
          lastReviewed: event.timestamp,
          sentimentScore: product.sentimentScore === 0
            ? sentiment
            : (product.sentimentScore + sentiment) / 2,
        },
      }

      // Update pet preference if pet_id present
      let updatedPets = s.pets
      if (petId) {
        const pet = s.pets[petId] ?? createDefaultPetPreference()
        const brand = (event.payload.brand as string)
        const updatedBrands = brand
          ? {
              ...pet.preferredBrands,
              [brand]: (pet.preferredBrands[brand] ?? 0) + 1,
            }
          : pet.preferredBrands

        updatedPets = {
          ...s.pets,
          [petId]: {
            ...pet,
            preferredBrands: updatedBrands,
          },
        }
      }

      return {
        ...s,
        products: updatedProducts,
        pets: updatedPets,
        lastUpdated: event.timestamp,
      }
    }

    case "ReviewUpdated": {
      const productId = (event.payload.product_id as string) ?? event.aggregateId
      const product = s.products[productId]
      if (!product) return s

      const rating = (event.payload.overall_rating as number) ?? product.avgRating
      const sentiment = (event.payload.sentiment_score as number) ?? product.sentimentScore

      return {
        ...s,
        products: {
          ...s.products,
          [productId]: {
            ...product,
            avgRating: rating,
            sentimentScore: sentiment,
          },
        },
        lastUpdated: event.timestamp,
      }
    }

    case "ReviewDeleted": {
      const productId = (event.payload.product_id as string) ?? event.aggregateId
      const product = s.products[productId]
      if (!product) return s

      const newCount = Math.max(0, product.reviewCount - 1)

      return {
        ...s,
        products: {
          ...s.products,
          [productId]: {
            ...product,
            reviewCount: newCount,
          },
        },
        lastUpdated: event.timestamp,
      }
    }

    case "BanditRewardRecorded": {
      const productId = (event.payload.product_id as string) ?? event.aggregateId
      const product = s.products[productId]
      if (!product) return s

      return {
        ...s,
        products: {
          ...s.products,
          [productId]: {
            ...product,
            totalRewards: product.totalRewards + 1,
          },
        },
        lastUpdated: event.timestamp,
      }
    }

    default:
      return s
  }
}
