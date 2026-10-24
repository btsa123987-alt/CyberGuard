"""Set up the project's isolated Python environment for VS Code on first run.

This helper never downloads executable scripts and never inspects submitted URLs.
Only pip installs the documented project dependencies.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ENV_DIR = ROOT / ".venv"
PYTHON = ENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
REQUIREMENTS = ROOT / "requirements.txt"
MARKER = ENV_DIR / ".cyberguard-requirements.sha256"


def main() -> int:
    if sys.version_info < (3, 11):
        print("CyberGuard needs Python 3.11 or newer (3.11-3.13 tested).")
        return 1

    digest = hashlib.sha256(REQUIREMENTS.read_bytes()).hexdigest()
    try:
        if not ENV_DIR.exists():
            print("Creating isolated .venv environment...")
            subprocess.run([sys.executable, "-m", "venv", str(ENV_DIR)], check=True)

        if not PYTHON.is_file():
            print("Existing .venv is incomplete. Rename it and run the setup task again.")
            return 1

        if MARKER.is_file() and MARKER.read_text(encoding="utf-8").strip() == digest:
            probe = subprocess.run(
                [str(PYTHON), "-c", "import flask, cv2, PIL, numpy"],
                capture_output=True,
                check=False,
            )
            if probe.returncode == 0:
                print("Dependencies ready: reusing existing environment.")
                return 0

        print("Installing requirements.txt into .venv (internet needed for first install)...")
        subprocess.run(
            [str(PYTHON), "-m", "pip", "install", "--disable-pip-version-check", "-r", str(REQUIREMENTS)],
            cwd=ROOT,
            check=True,
        )
        MARKER.write_text(digest + "\n", encoding="utf-8")
        print("CyberGuard environment ready. You can now start Flask with F5.")
        return 0
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"Environment setup failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
