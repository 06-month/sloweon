import { syncRagChunks } from "../src/lib/rag/sync";

async function main() {
  console.log("=== SLOWEON RAG Vector Sync ===");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Embedding Provider: ${process.env.EMBEDDING_PROVIDER || "openai"}\n`);

  try {
    const result = await syncRagChunks({ delayMs: 200 });

    console.log("\n=== Sync Complete ===");
    console.log(`Total chunks upserted: ${result.insertedOrUpdated}`);
    console.log(`Duration: ${result.durationMs}ms`);
    console.log("By source type:", result.sourceTypeCounts);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync failed:", message);
    process.exit(1);
  }
}

main();
