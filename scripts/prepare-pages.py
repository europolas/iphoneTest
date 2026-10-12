"""Prepare static Pages files with a content-based offline cache version."""
import hashlib
import shutil
import subprocess
from pathlib import Path

source = Path(__file__).resolve().parent.parent / "docs"
destination = Path(__file__).resolve().parent.parent / "build" / "pages"
digest = hashlib.sha256()
for path in sorted(source.rglob("*")):
    if path.is_file():
        digest.update(path.relative_to(source).as_posix().encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")

version = digest.hexdigest()
if destination.exists():
    shutil.rmtree(destination)
shutil.copytree(source, destination)
worker = destination / "sw.js"
text = worker.read_text()
if text.count("__BUILD_VERSION__") != 1:
    raise SystemExit("Expected exactly one service worker version placeholder")
worker.write_text(text.replace("__BUILD_VERSION__", version))
print(f"Prepared GitHub Pages version {version[:12]}")
root = source.parent
subprocess.run(["node", str(root / "scripts/build-starter.mjs"), "--output", str(destination / "starter")], check=True)
subprocess.run(["node", str(root / "scripts/export-toolkit.mjs")], check=True)
shutil.copytree(root / "build/downloads", destination / "downloads", dirs_exist_ok=True)
