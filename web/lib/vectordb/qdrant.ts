import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY || undefined,
});

export const QDRANT_COLLECTIONS = {
  reviews: "reviews_collection",
  products: "products_collection",
  symptoms: "symptom_collection",
} as const;

export const VECTOR_DIM = 1536;

export async function ensureCollections(): Promise<void> {
  const existing = await qdrant.getCollections();
  const names = existing.collections.map((c) => c.name);

  const specs = [
    {
      name: QDRANT_COLLECTIONS.reviews,
      payloadSchema: {
        review_id: "uuid",
        product_id: "uuid",
        platform: "keyword",
        sentiment: "keyword",
        has_symptoms: "bool",
        indexed_at: "datetime",
      },
    },
    {
      name: QDRANT_COLLECTIONS.products,
      payloadSchema: {
        product_id: "uuid",
        brand: "keyword",
        grain_free: "bool",
        life_stage: "keyword",
        price_range: "keyword",
        country: "keyword",
        indexed_at: "datetime",
      },
    },
    {
      name: QDRANT_COLLECTIONS.symptoms,
      payloadSchema: {
        symptom_type: "keyword",
        product_id: "uuid",
        review_id: "uuid",
        severity: "float",
        confidence: "float",
        indexed_at: "datetime",
      },
    },
  ];

  for (const spec of specs) {
    if (!names.includes(spec.name)) {
      await qdrant.createCollection(spec.name, {
        vectors: { size: VECTOR_DIM, distance: "Cosine" },
      });
      console.log(`[Qdrant] Created collection: ${spec.name}`);
    }
  }
}
