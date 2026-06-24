// =============================================
// Bandit State Reducer (Pure Function)
// Handles: ARM_SELECTED, REWARD_RECORDED, ARM_UPDATED
// Output: arms with alpha/beta counts for Thompson Sampling
// =============================================

import type { ProjectionEvent, ProjectionReducer } from "../projection-registry"

export interface BanditArmState {
  alpha: number
  beta: number
  rewardCount: number
  selectionCount: number
  lastReward: number | null
  lastSelected: string | null
}

export interface BanditStateProjection {
  arms: Record<string, BanditArmState>
  totalRewards: number
  totalSelections: number
  lastUpdated: string | null
}

const INITIAL_STATE: BanditStateProjection = {
  arms: {},
  totalRewards: 0,
  totalSelections: 0,
  lastUpdated: null,
}

function createDefaultArm(): BanditArmState {
  return {
    alpha: 1,
    beta: 1,
    rewardCount: 0,
    selectionCount: 0,
    lastReward: null,
    lastSelected: null,
  }
}

export const banditStateReducer: ProjectionReducer<BanditStateProjection> = (
  state: BanditStateProjection | undefined,
  event: ProjectionEvent
): BanditStateProjection => {
  const s = state ?? INITIAL_STATE

  switch (event.type) {
    case "BanditArmSelected": {
      const armId = (event.payload.arm_id as string) ?? event.aggregateId
      const arm = s.arms[armId] ?? createDefaultArm()

      return {
        ...s,
        arms: {
          ...s.arms,
          [armId]: {
            ...arm,
            selectionCount: arm.selectionCount + 1,
            lastSelected: event.timestamp,
          },
        },
        totalSelections: s.totalSelections + 1,
        lastUpdated: event.timestamp,
      }
    }

    case "BanditRewardRecorded": {
      const armId = (event.payload.arm_id as string) ?? event.aggregateId
      const reward = (event.payload.reward as number) ?? 0
      const arm = s.arms[armId] ?? createDefaultArm()

      // Thompson Sampling: alpha += reward, beta += (1 - reward) for binary rewards
      // For continuous rewards: alpha += reward, beta unchanged
      const isBinary = reward === 0 || reward === 1
      const newAlpha = isBinary ? arm.alpha + reward : arm.alpha + Math.max(0, reward)
      const newBeta = isBinary ? arm.beta + (1 - reward) : arm.beta

      return {
        ...s,
        arms: {
          ...s.arms,
          [armId]: {
            ...arm,
            alpha: newAlpha,
            beta: newBeta,
            rewardCount: arm.rewardCount + 1,
            lastReward: reward,
          },
        },
        totalRewards: s.totalRewards + 1,
        lastUpdated: event.timestamp,
      }
    }

    case "BanditWeightAdjusted": {
      const armId = (event.payload.arm_id as string) ?? event.aggregateId
      const newAlpha = (event.payload.alpha as number) ?? 1
      const newBeta = (event.payload.beta as number) ?? 1
      const arm = s.arms[armId] ?? createDefaultArm()

      return {
        ...s,
        arms: {
          ...s.arms,
          [armId]: {
            ...arm,
            alpha: newAlpha,
            beta: newBeta,
          },
        },
        lastUpdated: event.timestamp,
      }
    }

    default:
      return s
  }
}
