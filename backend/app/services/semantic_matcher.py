from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def calculate_semantic_match(
    job_text: str,
    candidate_text: str,
) -> dict:
    if not job_text or not job_text.strip():
        return {
            "score": 0.0,
            "status": "UNKNOWN",
        }

    if not candidate_text or not candidate_text.strip():
        return {
            "score": 0.0,
            "status": "UNKNOWN",
        }

    model = get_embedding_model()

    embeddings = model.encode(
        [job_text, candidate_text],
        normalize_embeddings=True,
    )

    # ---------------------------------------------------------
    # Protect against invalid embedding values
    # ---------------------------------------------------------

    embeddings = np.asarray(
        embeddings,
        dtype=np.float32,
    )

    if not np.isfinite(embeddings).all():
        print("\n" + "=" * 70)
        print("SEMANTIC MATCH DEBUG")
        print("=" * 70)
        print("Embedding shape:", embeddings.shape)
        print("Contains NaN:", np.isnan(embeddings).any())
        print("Contains +Inf:", np.isposinf(embeddings).any())
        print("Contains -Inf:", np.isneginf(embeddings).any())
        print("Job text length:", len(job_text))
        print("Candidate text length:", len(candidate_text))
        print("Job text preview:", repr(job_text[:500]))
        print(
            "Candidate text preview:",
            repr(candidate_text[:500]),
       )
        print("=" * 70)

        return {
            "score": 0.0,
            "status": "UNAVAILABLE",
        }

    if embeddings.shape[0] != 2:
        return {
            "score": 0.0,
            "status": "UNAVAILABLE",
        }

    # ---------------------------------------------------------
    # Calculate cosine similarity
    # ---------------------------------------------------------

    similarity = cosine_similarity(
        embeddings[0:1],
        embeddings[1:2],
    )[0][0]

    # ---------------------------------------------------------
    # Protect against invalid similarity
    # ---------------------------------------------------------

    if not np.isfinite(similarity):
        return {
            "score": 0.0,
            "status": "UNAVAILABLE",
        }

    similarity = max(
        0.0,
        min(1.0, float(similarity)),
    )

    score = similarity * 100

    if score >= 75:
        status = "STRONG_MATCH"
    elif score >= 50:
        status = "RELATED"
    elif score >= 25:
        status = "PARTIAL"
    else:
        status = "LOW_MATCH"

    return {
        "score": round(score, 2),
        "status": status,
    }
