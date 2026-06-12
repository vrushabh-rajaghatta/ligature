"""Mock/demo data loader.

JSON files in app/data/ are dumped from the original src/data/*.ts modules
(via scripts/dump-mock.mts) so fallback responses stay byte-compatible with
the Next.js app.
"""
import json
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@lru_cache(maxsize=None)
def load_mock(name: str) -> dict:
    """Load a dumped data module by name, e.g. load_mock('mock')['products']."""
    path = DATA_DIR / f"{name}.json"
    with path.open() as f:
        return json.load(f)
