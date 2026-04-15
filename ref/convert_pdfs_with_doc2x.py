#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
import zipfile
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://v2.doc2x.noedgeai.com"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert PDFs in paper_pdf to markdown + images using Doc2X API."
    )
    parser.add_argument(
        "--input-dir",
        default="paper_pdf",
        help="Directory containing PDF files (default: paper_pdf)",
    )
    parser.add_argument(
        "--output-dir",
        default="paper_md",
        help="Directory to store markdown and extracted images (default: paper_md)",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Doc2X API base URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--model",
        default="v2",
        choices=["v2", "v3-2026"],
        help="Doc2X model used in preupload (default: v2)",
    )
    parser.add_argument(
        "--formula-mode",
        default="normal",
        choices=["normal", "dollar"],
        help="Formula mode for md export (default: normal)",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=2.0,
        help="Polling interval in seconds (default: 2.0)",
    )
    parser.add_argument(
        "--task-timeout",
        type=int,
        default=1800,
        help="Max wait seconds per PDF task (default: 1800)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay seconds between submitting two PDFs (default: 1.0)",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Retry times for transient request failures (default: 3)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Only process first N PDFs (0 means all)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run even when output folder already has .md files",
    )
    return parser.parse_args()


def request_json(
    method: str,
    url: str,
    api_key: Optional[str] = None,
    json_body: Optional[Dict[str, Any]] = None,
    binary_body: Optional[bytes] = None,
    timeout: int = 60,
    retries: int = 0,
) -> Dict[str, Any]:
    headers = {"User-Agent": "doc2x-pdf-md-extractor/1.0"}
    data = None

    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if binary_body is not None:
        data = binary_body

    last_err = None
    for attempt in range(retries + 1):
        try:
            req = Request(url=url, method=method, headers=headers, data=data)
            with urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                return json.loads(raw) if raw else {}
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
            last_err = e
            if attempt < retries:
                code = getattr(e, "code", None)
                # Respect common API rate limiting behavior.
                time.sleep(4.0 if code == 429 else 1.5 * (attempt + 1))
            else:
                raise RuntimeError(f"Request failed ({method} {url}): {e}") from e
    raise RuntimeError(f"Request failed: {last_err}")


def request_bytes(
    method: str,
    url: str,
    binary_body: Optional[bytes] = None,
    timeout: int = 120,
    retries: int = 0,
) -> bytes:
    headers = {"User-Agent": "doc2x-pdf-md-extractor/1.0"}
    data = binary_body if binary_body is not None else None

    for attempt in range(retries + 1):
        try:
            req = Request(url=url, method=method, headers=headers, data=data)
            with urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (HTTPError, URLError, TimeoutError, OSError) as e:
            if attempt < retries:
                code = getattr(e, "code", None)
                time.sleep(4.0 if code == 429 else 1.5 * (attempt + 1))
            else:
                raise RuntimeError(f"Request failed ({method} {url}): {e}") from e
    raise RuntimeError(f"Request failed ({method} {url})")


def ensure_success(resp: Dict[str, Any], context: str) -> Dict[str, Any]:
    if resp.get("code") != "success":
        raise RuntimeError(f"{context} failed: {resp}")
    data = resp.get("data")
    if not isinstance(data, dict):
        raise RuntimeError(f"{context} failed: missing data field")
    return data


def poll_until_done(
    fetch_fn,
    timeout_sec: int,
    poll_interval: float,
    context: str,
) -> Dict[str, Any]:
    started = time.time()
    while True:
        data = fetch_fn()
        status = data.get("status")
        if status == "success":
            return data
        if status == "failed":
            detail = data.get("detail")
            raise RuntimeError(f"{context} failed: {detail or data}")
        if time.time() - started > timeout_sec:
            raise TimeoutError(f"{context} timeout after {timeout_sec}s")
        time.sleep(poll_interval)


def unzip_to_dir(zip_bytes: bytes, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / "_doc2x_export.zip"
    zip_path.write_bytes(zip_bytes)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(out_dir)
    zip_path.unlink(missing_ok=True)


def has_markdown_file(folder: Path) -> bool:
    return any(p.suffix.lower() == ".md" for p in folder.glob("**/*.md"))


def convert_one_pdf(
    pdf_path: Path,
    out_dir: Path,
    api_key: str,
    base_url: str,
    model: str,
    formula_mode: str,
    poll_interval: float,
    task_timeout: int,
    retries: int,
) -> None:
    preupload_data = ensure_success(
        request_json(
            method="POST",
            url=f"{base_url}/api/v2/parse/preupload",
            api_key=api_key,
            json_body={"model": model},
            retries=retries,
        ),
        context="preupload",
    )
    uid = str(preupload_data.get("uid", ""))
    upload_url = str(preupload_data.get("url", ""))
    if not uid or not upload_url:
        raise RuntimeError(f"preupload invalid response: {preupload_data}")

    pdf_bytes = pdf_path.read_bytes()
    request_bytes("PUT", upload_url, binary_body=pdf_bytes, retries=retries)

    def get_parse_status() -> Dict[str, Any]:
        query = urlencode({"uid": uid})
        status_resp = request_json(
            method="GET",
            url=f"{base_url}/api/v2/parse/status?{query}",
            api_key=api_key,
            retries=retries,
        )
        return ensure_success(status_resp, context="parse/status")

    poll_until_done(
        fetch_fn=get_parse_status,
        timeout_sec=task_timeout,
        poll_interval=poll_interval,
        context=f"parse ({pdf_path.name})",
    )

    export_payload = {
        "uid": uid,
        "to": "md",
        "formula_mode": formula_mode,
        "filename": pdf_path.stem,
    }
    ensure_success(
        request_json(
            method="POST",
            url=f"{base_url}/api/v2/convert/parse",
            api_key=api_key,
            json_body=export_payload,
            retries=retries,
        ),
        context="convert/parse",
    )

    def get_export_status() -> Dict[str, Any]:
        query = urlencode({"uid": uid})
        export_resp = request_json(
            method="GET",
            url=f"{base_url}/api/v2/convert/parse/result?{query}",
            api_key=api_key,
            retries=retries,
        )
        return ensure_success(export_resp, context="convert/parse/result")

    export_data = poll_until_done(
        fetch_fn=get_export_status,
        timeout_sec=task_timeout,
        poll_interval=poll_interval,
        context=f"export ({pdf_path.name})",
    )

    zip_url = str(export_data.get("url", ""))
    if not zip_url:
        raise RuntimeError("convert/parse/result succeeded but missing url")
    # Doc note: URL may contain \u0026, normalize before downloading.
    zip_url = zip_url.replace("\\u0026", "&")

    zip_bytes = request_bytes("GET", zip_url, retries=retries)
    unzip_to_dir(zip_bytes, out_dir)


def main() -> int:
    args = parse_args()
    api_key = os.environ.get("DOC2X_API_KEY", "").strip()
    if not api_key:
        print("[error] Missing env var DOC2X_API_KEY")
        return 1

    base_dir = Path(__file__).resolve().parent
    input_dir = (base_dir / args.input_dir).resolve()
    output_dir = (base_dir / args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        print(f"[error] input dir not found: {input_dir}")
        return 1

    pdf_files = sorted(input_dir.glob("*.pdf"))
    if args.limit > 0:
        pdf_files = pdf_files[: args.limit]

    if not pdf_files:
        print(f"[info] no pdf files found in: {input_dir}")
        return 0

    total = len(pdf_files)
    ok = 0
    skipped = 0
    failed = 0

    for idx, pdf in enumerate(pdf_files, start=1):
        target_dir = output_dir / pdf.stem
        if target_dir.exists() and has_markdown_file(target_dir) and not args.force:
            print(f"[{idx}/{total}] skip: already converted -> {pdf.name}")
            skipped += 1
            continue

        target_dir.mkdir(parents=True, exist_ok=True)
        print(f"[{idx}/{total}] start: {pdf.name}")
        try:
            convert_one_pdf(
                pdf_path=pdf,
                out_dir=target_dir,
                api_key=api_key,
                base_url=args.base_url.rstrip("/"),
                model=args.model,
                formula_mode=args.formula_mode,
                poll_interval=args.poll_interval,
                task_timeout=args.task_timeout,
                retries=args.retries,
            )
            ok += 1
            print(f"[{idx}/{total}] ok: {pdf.name} -> {target_dir}")
        except Exception as e:
            failed += 1
            print(f"[{idx}/{total}] fail: {pdf.name} -> {e}")

        if args.delay > 0 and idx < total:
            time.sleep(args.delay)

    print(
        f"\nDone. total={total}, converted={ok}, skipped={skipped}, failed={failed}, output={output_dir}"
    )
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
