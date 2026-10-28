
from functools import lru_cache

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model():
    """Load the embedding model only when semantic matching is used."""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def calculate_semantic_match(
    job_text: str,
    candidate_text: str,
) -> dict:
    if not job_text or not job_text.strip():
        return {"score": 0.0, "status": "UNKNOWN"}

    if not candidate_text or not candidate_text.strip():
        return {"score": 0.0, "status": "UNKNOWN"}

    try:
        model = get_embedding_model()

        embeddings = model.encode(
            [job_text, candidate_text],
            normalize_embeddings=True,
        )

        embeddings = np.asarray(embeddings, dtype=np.float32)

        if (
            embeddings.shape[0] != 2
            or not np.isfinite(embeddings).all()
        ):
            return {"score": 0.0, "status": "UNAVAILABLE"}

        similarity = cosine_similarity(
            embeddings[0:1],
            embeddings[1:2],
        )[0][0]

        if not np.isfinite(similarity):
            return {"score": 0.0, "status": "UNAVAILABLE"}

        similarity = max(0.0, min(1.0, float(similarity)))
        score = similarity * 100

        if score >= 75:
            match_status = "STRONG_MATCH"
        elif score >= 50:
            match_status = "RELATED"
        elif score >= 25:
            match_status = "PARTIAL"
        else:
            match_status = "LOW_MATCH"

        return {
            "score": round(score, 2),
            "status": match_status,
        }

    except ImportError:
        # Semantic matching dependencies are not installed.
        return {"score": 0.0, "status": "UNAVAILABLE"}
    except Exception as exc:
        print(f"Semantic matching unavailable: {exc}")
        return {"score": 0.0, "status": "UNAVAILABLE"}
