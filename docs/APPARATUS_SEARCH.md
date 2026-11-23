# Apparatus Search

The drawing palette searches all functional apparatus domains by default. Domain
(`apparatusDomain`) and subcategory (`apparatusCategory`) filters remain available.
Results combine local semantic similarity with exact names and aliases; literal
matches are preserved even when there are many related semantic results. Arrow-down
moves from the search box to its results, and Enter activates the selected result.

Inference uses the MIT-licensed BAAI `bge-small-zh-v1.5` model, exported to ONNX by
Xenova at revision `75c43b069aac4d136ba6bc1122f995fedcfd2781`. It produces normalized
512-dimensional CLS embeddings. ONNX Runtime 1.20.1 runs on the CPU in a background
task. Search has a short debounce, keeps only the latest request, and ignores
outdated results. No API key, network request, or local server is used at runtime.

The pinned case-sensitive BERT WordPiece tokenizer is verified against Hugging
Face Tokenizers 0.22.1. The model's recommended Chinese query instruction is used.
Catalog vectors have a content fingerprint (`chem-apparatus-search-v2:`), so metadata
or catalog changes rebuild the index. An invalid or unavailable model falls back to
keyword matching.

## Setup

Run `scripts/setup-deps.ps1` to download WebView2 SDK and ONNX Runtime 1.20.1 into
`deps/` (or pass `-DependencyDirectory`). Optionally run `scripts/fetch-semantic-model.ps1`
to install the checksum-verified quantized BGE model under `deps/models/bge-small-zh-v1.5`.

Build `chem_search_index`, then run it with `--build-index` and the desired output
path. An installed application finds `semantic-search/apparatus-search.bin` or
`semantic-search/catalog-vectors.bin` beside its model, or uses a per-user cache if
the catalog differs. The default model directory is `semantic-search` alongside
`ChemStudio.exe`.

`CHEM_SEARCH_MODEL_DIR` and `CHEM_SEARCH_CACHE` override model and cache locations
for controlled verification. `chem_search_index` also accepts query strings and
prints their rankings, scores, latency, and tokenizer IDs as JSON.

CTest's `apparatus_search` suite covers functional taxonomy & zero-duplicate checks,
model failure fallback, and (when the BGE model is downloaded) natural-language
semantic retrieval, exact matches, input limits, cache export, and rapidly replaced
queries.

Model sources: https://huggingface.co/BAAI/bge-small-zh-v1.5 and
https://huggingface.co/Xenova/bge-small-zh-v1.5. Native runtime source:
https://www.nuget.org/packages/Microsoft.ML.OnnxRuntime/1.20.1.
