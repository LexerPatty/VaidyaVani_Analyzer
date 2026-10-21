from functools import lru_cache

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from app.config import settings

# Add these to app/config.py (defaults shown):
#   chroma_dir: str = "./corrective_rag_db"
#   chroma_collection: str = "crag_demo"
#   hf_embed_model: str = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache()
def clients():
    """Returns (embeddings, vectorstore). Replaces the OpenAI + Pinecone clients."""
    embeddings = HuggingFaceEmbeddings(
        model_name=settings.embed_model,
        encode_kwargs={"normalize_embeddings": True},
    )
    vectorstore = Chroma(
        collection_name=settings.chroma_collection,
        embedding_function=embeddings,
        persist_directory=settings.chroma_dir,
        collection_metadata={"hnsw:space": "cosine"},  # so score = 1 - distance
    )
    return embeddings, vectorstore


def ensure_index():
    """Chroma creates the collection automatically; just return the vectorstore."""
    _, vs = clients()
    return vs


def embed(texts):
    emb, _ = clients()
    return emb.embed_documents(texts)


def add_documents(chunks):
    """Use this once to ingest your chunks (list of LangChain Documents)."""
    return ensure_index().add_documents(chunks)


def search_kb(query, top_k=5):
    vs = ensure_index()
    results = vs.similarity_search_with_score(query, k=top_k)  # (Document, distance)
    out = []
    for doc, distance in results:
        score = round(1 - distance, 3)  # cosine distance -> similarity
        if score >= 0.30:
            out.append({
                'page': doc.metadata.get('page'),
                'text': doc.page_content,
                'score': score,
                'source': 'Gale Encyclopedia (2002)',
            })
    return out