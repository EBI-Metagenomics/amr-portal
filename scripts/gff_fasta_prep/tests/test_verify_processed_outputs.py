#!/usr/bin/env python3

import gzip
import sys
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

from verify_processed_outputs import (  # noqa: E402
    ExpectedOutputs,
    assembly_from_annotation_gff,
    expected_outputs,
    gff_has_embedded_fasta,
    verify_genome,
)


class PathDerivationTests(unittest.TestCase):
    def test_assembly_from_annotation_gff(self) -> None:
        path = Path("/data/ERZ/252/016/ERZ25201620/ERZ25201620_annotations.gff.gz")
        self.assertEqual(assembly_from_annotation_gff(path), "ERZ25201620")

    def test_expected_outputs(self) -> None:
        gff = Path("/data/ERZ25201620/ERZ25201620_annotations.gff.gz")
        outputs = expected_outputs(gff)
        self.assertEqual(
            outputs,
            ExpectedOutputs(
                gff_gz=gff,
                gff_csi=Path("/data/ERZ25201620/ERZ25201620_annotations.gff.gz.csi"),
                fasta_gz=Path("/data/ERZ25201620/ERZ25201620.fasta.gz"),
                fasta_fai=Path("/data/ERZ25201620/ERZ25201620.fasta.gz.fai"),
                temp_gff=Path("/data/ERZ25201620/ERZ25201620_annotations.tmp.gff"),
                plain_fasta=Path("/data/ERZ25201620/ERZ25201620.fasta"),
            ),
        )


class ValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(self._testMethodName)
        self.tmp.mkdir(exist_ok=True)

    def tearDown(self) -> None:
        for path in sorted(self.tmp.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
        self.tmp.rmdir()

    def _write_gff(self, name: str, content: str) -> Path:
        path = self.tmp / name
        with gzip.open(path, "wt", encoding="utf-8") as handle:
            handle.write(content)
        return path

    def test_detects_embedded_fasta(self) -> None:
        with_fasta = self._write_gff(
            "ERZ1_annotations.gff.gz",
            "##gff-version 3\nchr1\t.\tgene\t1\t10\t.\t+\t.\n##FASTA\n>chr1\nACGT\n",
        )
        without_fasta = self._write_gff(
            "ERZ2_annotations.gff.gz",
            "##gff-version 3\nchr1\t.\tgene\t1\t10\t.\t+\t.\n",
        )
        self.assertTrue(gff_has_embedded_fasta(with_fasta))
        self.assertFalse(gff_has_embedded_fasta(without_fasta))

    def test_verify_passes_when_all_outputs_present(self) -> None:
        gff = self._write_gff(
            "ERZ9_annotations.gff.gz",
            "##gff-version 3\nchr1\t.\tgene\t1\t10\t.\t+\t.\n",
        )
        Path(f"{gff}.csi").write_bytes(b"\x00")
        fasta_gz = self.tmp / "ERZ9.fasta.gz"
        fasta_fai = self.tmp / "ERZ9.fasta.gz.fai"
        with gzip.open(fasta_gz, "wt", encoding="utf-8") as handle:
            handle.write(">chr1\nACGT\n")
        fasta_fai.write_text("chr1\t6\t8\t1\t5\n", encoding="utf-8")

        result = verify_genome(gff, require_tools=False)
        self.assertTrue(result.ok, result.messages)

    def test_verify_fails_when_outputs_missing(self) -> None:
        gff = self._write_gff(
            "ERZ8_annotations.gff.gz",
            "##gff-version 3\nchr1\t.\tgene\t1\t10\t.\t+\t.\n",
        )
        result = verify_genome(gff, require_tools=False)
        self.assertFalse(result.ok)
        self.assertTrue(any("missing" in msg for msg in result.messages))


if __name__ == "__main__":
    unittest.main()
