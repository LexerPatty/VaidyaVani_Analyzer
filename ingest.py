# from app.config import settings
# s = settings
# print(f"Groq API Key: {s.groq_api_key}")


import argparse
import hashlib
from pathlib import Path
import fitz
from app.knowledge import ensure_index


def chunks(text, size=1000, overlap=200):
    text = ' '.join(text.split())
    step = size - overlap
    return [text[i:i+size] for i in range(0, len(text), step) if len(text[i:i+size]) > 80]


def flush(vs, batch):
    # add_texts embeds the texts automatically using the embedding model from knowledge.py.
    # Passing ids makes re-running the script safe: the same chunk just overwrites itself.
    vs.add_texts(
        texts=[b[1] for b in batch],
        metadatas=[b[2] for b in batch],
        ids=[b[0] for b in batch],
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', default=r"C:\Users\ce\Downloads\Medical_book.pdf")
    args = parser.parse_args()
    pdf = Path(args.pdf)
    if not pdf.exists():
        raise SystemExit(f'PDF not found: {pdf}')
    vs = ensure_index()
    with fitz.open(pdf) as doc:
        batch = []
        for page_number, page in enumerate(doc, start=1):
            for part, content in enumerate(chunks(page.get_text()), start=1):
                key = hashlib.sha256(f'{pdf.name}:{page_number}:{part}:{content}'.encode()).hexdigest()
                batch.append((key, content, {'page': page_number, 'file': pdf.name}))
                if len(batch) >= 50:
                    flush(vs, batch)
                    batch = []
            if page_number % 50 == 0:
                print(f'Indexed pages: {page_number}/{len(doc)}', flush=True)
        if batch:
            flush(vs, batch)
    print('Ingestion complete')


if __name__ == '__main__':
    main()