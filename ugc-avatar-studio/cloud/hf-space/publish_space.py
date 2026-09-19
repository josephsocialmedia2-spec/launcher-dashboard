from __future__ import annotations

import os
from pathlib import Path
from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parent
OWNER = os.environ.get("HF_SPACE_OWNER", "realmediajo")
SPACE = os.environ.get("HF_SPACE_NAME", "ugc-avatar-studio")
REPO_ID = f"{OWNER}/{SPACE}"


def main() -> None:
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise SystemExit("HF_TOKEN con permesso write non presente.")

    api = HfApi(token=token)
    me = api.whoami()
    print(f"Authenticated as: {me.get('name') or me.get('fullname')}")
    api.create_repo(
        repo_id=REPO_ID,
        repo_type="space",
        space_sdk="gradio",
        space_hardware="zero-a10g",
        private=False,
        exist_ok=True,
    )
    api.upload_folder(
        repo_id=REPO_ID,
        repo_type="space",
        folder_path=str(ROOT),
        path_in_repo="",
        ignore_patterns=["__pycache__/**", "*.pyc", ".pytest_cache/**"],
        commit_message="Deploy UGC Avatar Studio Cloud",
    )
    try:
        api.request_space_hardware(repo_id=REPO_ID, hardware="zero-a10g")
    except Exception as exc:
        print(f"ZeroGPU hardware request not applied automatically: {exc}")

    info = api.space_info(REPO_ID)
    print(f"SPACE_URL=https://huggingface.co/spaces/{REPO_ID}")
    subdomain = getattr(info, "subdomain", None)
    if subdomain:
        print(f"APP_URL=https://{subdomain}.hf.space")


if __name__ == "__main__":
    main()
