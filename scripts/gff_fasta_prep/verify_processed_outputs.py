#!/usr/bin/env python3
"""
Spot-check processed GFF/FASTA outputs after a prep run.

Randomly samples entries from a work list (or scans a genomes tree) and verifies
that each genome has the expected indexed artifacts and basic file validity.

Usage:
  ./verify_processed_outputs.py --gff-list gff_files.lst --sample 20
  ./verify_processed_outputs.py --genomes-dir /path/to/genomes --sample 10 --seed 42
"""

from __future__ import annotations

import argparse
import gzip
import random
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


ANNOTATION_SUFFIX = "_annotations.gff.gz"


@dataclass(frozen=True)
class ExpectedOutputs:
    gff_gz: Path
    gff_csi: Path
    fasta_gz: Path
    fasta_fai: Path
    temp_gff: Path
    plain_fasta: Path


@dataclass
class CheckResult:
    gff_path: Path
    ok: bool
    messages: List[str]


def assembly_from_annotation_gff(path: Path) -> str:
    name = path.name
    if not name.endswith(ANNOTATION_SUFFIX):
        raise ValueError(f"Not an annotation GFF: {path}")
    return name[: -len(ANNOTATION_SUFFIX)]


def expected_outputs(gff_gz: Path) -> ExpectedOutputs:
    assembly = assembly_from_annotation_gff(gff_gz)
    parent = gff_gz.parent
    gff_base = gff_gz.name[: -len(".gff.gz")]
    return ExpectedOutputs(
        gff_gz=gff_gz,
        gff_csi=Path(f"{gff_gz}.csi"),
        fasta_gz=parent / f"{assembly}.fasta.gz",
        fasta_fai=parent / f"{assembly}.fasta.gz.fai",
        temp_gff=parent / f"{gff_base}.tmp.gff",
        plain_fasta=parent / f"{assembly}.fasta",
    )


def load_gff_paths_from_list(list_path: Path) -> List[Path]:
    paths: List[Path] = []
    for line in list_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            paths.append(Path(line))
    return paths


def discover_gff_paths(genomes_dir: Path) -> List[Path]:
    return sorted(genomes_dir.rglob(f"*{ANNOTATION_SUFFIX}"))


def sample_paths(paths: List[Path], sample_size: int, seed: Optional[int]) -> List[Path]:
    if sample_size >= len(paths):
        return list(paths)
    rng = random.Random(seed)
    return rng.sample(paths, sample_size)


def run_cmd(args: List[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=False)


def gff_has_embedded_fasta(gff_gz: Path, read_limit: int = 256_000) -> bool:
    with gzip.open(gff_gz, "rt", encoding="utf-8", errors="replace") as handle:
        chunk = handle.read(read_limit)
    return "\n##FASTA\n" in chunk or chunk.strip() == "##FASTA"


def fai_is_consistent(fasta_gz: Path, fasta_fai: Path, *, use_samtools: bool) -> tuple[bool, str]:
    lines = [
        line.strip()
        for line in fasta_fai.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if not lines:
        return False, "FAI is empty"

    first_name = lines[0].split("\t", 1)[0]
    if use_samtools and shutil.which("samtools"):
        proc = run_cmd(["samtools", "faidx", str(fasta_gz), first_name])
        if proc.returncode != 0:
            return False, f"samtools faidx failed for {first_name}: {proc.stderr.strip()}"
        if not proc.stdout.startswith(">"):
            return False, f"samtools faidx returned no FASTA record for {first_name}"
        return True, f"samtools fetched {first_name}"

    # Fallback without samtools: at least validate FAI shape.
    parts = lines[0].split("\t")
    if len(parts) < 2 or not parts[1].isdigit():
        return False, "FAI first line is malformed"
    return True, f"FAI lists {len(lines)} sequence(s); samtools not available for fetch test"


def verify_genome(gff_gz: Path, *, require_tools: bool) -> CheckResult:
    messages: list[str] = []
    ok = True

    def fail(msg: str) -> None:
        nonlocal ok
        ok = False
        messages.append(f"FAIL: {msg}")

    def pass_(msg: str) -> None:
        messages.append(f"OK: {msg}")

    try:
        outputs = expected_outputs(gff_gz)
    except ValueError as exc:
        return CheckResult(gff_gz, False, [f"FAIL: {exc}"])

    for label, path in (
        ("GFF", outputs.gff_gz),
        ("GFF CSI", outputs.gff_csi),
        ("FASTA.gz", outputs.fasta_gz),
        ("FASTA.gz.fai", outputs.fasta_fai),
    ):
        if not path.is_file():
            fail(f"missing {label}: {path}")
        elif path.stat().st_size == 0:
            fail(f"empty {label}: {path}")
        else:
            pass_(f"{label} present ({path.stat().st_size:,} bytes)")

    for label, path in (("temp GFF", outputs.temp_gff), ("plain FASTA", outputs.plain_fasta)):
        if path.exists():
            fail(f"leftover {label}: {path}")

    if outputs.gff_gz.is_file():
        if gff_has_embedded_fasta(outputs.gff_gz):
            fail("GFF still contains ##FASTA (split did not run or failed)")
        else:
            pass_("GFF has no embedded ##FASTA section")

    if require_tools and shutil.which("bgzip"):
        for label, path in (("GFF", outputs.gff_gz), ("FASTA", outputs.fasta_gz)):
            proc = run_cmd(["bgzip", "-t", str(path)])
            if proc.returncode != 0:
                fail(f"bgzip -t failed for {label}: {proc.stderr.strip() or proc.stdout.strip()}")
            else:
                pass_(f"{label} is valid BGZF")

    if require_tools and shutil.which("tabix") and outputs.gff_csi.is_file():
        proc = run_cmd(["tabix", "-l", str(outputs.gff_gz)])
        if proc.returncode != 0:
            fail(f"tabix -l failed: {proc.stderr.strip() or proc.stdout.strip()}")
        else:
            regions = [line for line in proc.stdout.splitlines() if line.strip()]
            if regions:
                pass_(f"tabix lists {len(regions)} sequence(s); first={regions[0]!r}")
            else:
                fail("tabix -l returned no sequences")

    if outputs.fasta_gz.is_file() and outputs.fasta_fai.is_file():
        consistent, detail = fai_is_consistent(
            outputs.fasta_gz,
            outputs.fasta_fai,
            use_samtools=require_tools,
        )
        if consistent:
            pass_(detail)
        else:
            fail(detail)

    return CheckResult(gff_gz, ok, messages)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--gff-list", type=Path, help="Work list from generate_gff_file_list.sh")
    source.add_argument("--genomes-dir", type=Path, help="Root directory to scan recursively")
    parser.add_argument("--sample", type=int, default=10, help="Number of genomes to check")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    parser.add_argument(
        "--no-tool-checks",
        action="store_true",
        help="Skip bgzip/tabix/samtools validation (file presence only)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    if args.gff_list:
        if not args.gff_list.is_file():
            print(f"GFF list not found: {args.gff_list}", file=sys.stderr)
            return 1
        all_paths = load_gff_paths_from_list(args.gff_list)
    else:
        if not args.genomes_dir.is_dir():
            print(f"Not a directory: {args.genomes_dir}", file=sys.stderr)
            return 1
        all_paths = discover_gff_paths(args.genomes_dir)

    if not all_paths:
        print("No annotation GFF paths found.", file=sys.stderr)
        return 1

    selected = sample_paths(all_paths, args.sample, args.seed)
    print(f"Checking {len(selected)} of {len(all_paths)} genome(s)")
    if args.seed is not None:
        print(f"Random seed: {args.seed}")

    failures = 0
    for gff_path in selected:
        result = verify_genome(gff_path, require_tools=not args.no_tool_checks)
        print(f"\n=== {gff_path} ===")
        for line in result.messages:
            print(f"  {line}")
        if not result.ok:
            failures += 1

    print(f"\nSummary: {len(selected) - failures} passed, {failures} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
