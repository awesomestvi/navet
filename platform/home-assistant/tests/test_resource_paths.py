"""Regression tests for the legacy resource redirect's same-origin contract."""

import importlib.util
from pathlib import Path
import unittest

_path = Path(__file__).parents[1] / "custom_components/navet/resource_paths.py"
_spec = importlib.util.spec_from_file_location("navet_resource_paths", _path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)


class ResourcePathTests(unittest.TestCase):
    def test_preserves_native_home_assistant_resource_paths(self):
        for path in ("api/camera_proxy/camera.front", "local/artwork.jpg", ""):
            self.assertEqual(_module.compatibility_resource_path(path), f"/{path}")

    def test_rejects_cross_origin_and_ambiguous_redirects(self):
        for path in ("/attacker.example", "//attacker.example", "\\attacker.example", "api\\secret", "../secret", "api/../secret", "\n/attacker.example", "api/\x7fsecret"):
            with self.subTest(path=path):
                self.assertIsNone(_module.compatibility_resource_path(path))
