import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const redis = new Redis({
  url: UPSTASH_REDIS_URL,
  token: UPSTASH_REDIS_TOKEN,
});

const TTL = {
  recommendation: 60 * 30,
  product_confidence: 60 * 60,
  risk_intel: 60 * 15,
  user_reputation: 60 * 30,
} as const;

const PREFIX = "pflid";

function key(namespace: string, id: string): string {
  return `${PREFIX}:${namespace}:${id}`;
}

export const cache = {
  recommendation: {
    async get(petId: string, contextHash: string) {
      return redis.get<object>(key("rec", `${petId}:${contextHash}`));
    },
    async set(petId: string, contextHash: string, data: object) {
      return redis.set(key("rec", `${petId}:${contextHash}`), data, {
        ex: TTL.recommendation,
      });
    },
  },

  productConfidence: {
    async get(productId: string) {
      return redis.get<number>(key("pconf", productId));
    },
    async set(productId: string, score: number) {
      return redis.set(key("pconf", productId), score, {
        ex: TTL.product_confidence,
      });
    },
    async invalidate(productId: string) {
      return redis.del(key("pconf", productId));
    },
  },

  riskIntel: {
    async get(productId: string) {
      return redis.get<object>(key("risk", productId));
    },
    async set(productId: string, data: object) {
      return redis.set(key("risk", productId), data, { ex: TTL.risk_intel });
    },
  },

  userReputation: {
    async get(profileId: string) {
      return redis.get<number>(key("rep", profileId));
    },
    async set(profileId: string, score: number) {
      return redis.set(key("rep", profileId), score, {
        ex: TTL.user_reputation,
      });
    },
  },
};
