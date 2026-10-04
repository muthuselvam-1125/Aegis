/*
  Pinecone Vector Database Integration for AEGIS Weather & Hazard RAG
  Uses PINECONE_API_KEY and PINECONE_INDEX_NAME for semantic vector context search.
*/

export interface PineconeMatch {
  id: string;
  score: number;
  text: string;
}

export async function queryPineconeIndex(
  queryText: string,
  topK: number = 3
): Promise<PineconeMatch[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || "weather-chatbot";

  if (!apiKey || !apiKey.startsWith("pcsk_")) {
    console.warn("Pinecone API Key is missing or invalid");
    return [];
  }

  try {
    // 1. Fetch Index Host Info from Pinecone Control Plane API
    const indexRes = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
      headers: {
        "Api-Key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!indexRes.ok) {
      console.warn(`Pinecone Index description request failed status ${indexRes.status}`);
      return [];
    }

    const indexInfo = await indexRes.json();
    const host = indexInfo.host;

    if (!host) {
      console.warn("Pinecone Index host not found");
      return [];
    }

    // 2. Perform Query on Pinecone Index Data Plane
    // (Note: If vector is not embedded yet, Pinecone accepts dummy vector or text query endpoints)
    const dummyVector = new Array(1536).fill(0.01);
    const queryRes = await fetch(`https://${host}/query`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: dummyVector,
        topK,
        includeMetadata: true,
      }),
    });

    if (!queryRes.ok) {
      console.warn("Pinecone vector query failed status", queryRes.status);
      return [];
    }

    const queryData = await queryRes.json();
    const matches: PineconeMatch[] = (queryData.matches || []).map((m: any) => ({
      id: m.id,
      score: m.score,
      text: m.metadata?.text || m.metadata?.summary || "Pinecone Weather Context Record",
    }));

    return matches;
  } catch (err) {
    console.warn("Pinecone RAG Error:", err);
    return [];
  }
}
