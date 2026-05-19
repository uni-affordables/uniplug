CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.product_vectors (
  vector_id UUID PRIMARY KEY,
  product_id UUID NOT NULL UNIQUE,
  embedding vector(768) NOT NULL,
  CONSTRAINT product_vectors_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.product(product_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS product_vector_hnsw_idx
  ON public.product_vectors
  USING hnsw (embedding vector_cosine_ops);
