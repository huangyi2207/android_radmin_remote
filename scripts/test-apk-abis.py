#!/usr/bin/env python3
"""Headless APK packaging checks using synthetic ZIPs, without Android or real keys."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('apk_abis', Path(__file__).with_name('verify-apk-abis.py'))
apk_abis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apk_abis)


class ApkAbiTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='openrad-apk-test-')
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def write_apk(self, name, abis, library='libgojni.so', payload=b'synthetic JNI library'):
        apk = self.directory / name
        with zipfile.ZipFile(apk, 'w') as archive:
            archive.writestr('AndroidManifest.xml', b'synthetic manifest')
            for abi in abis:
                archive.writestr(f'lib/{abi}/{library}', payload)
        return apk

    def write_outputs(self, build_type='debug'):
        for abi in apk_abis.ABIS:
            self.write_apk(f'app-{abi}-{build_type}.apk', {abi})
        self.write_apk(f'app-universal-{build_type}.apk', set(apk_abis.ABIS))

    def test_all_debug_outputs(self):
        self.write_outputs()
        apks = apk_abis.verify_apks(self.directory, 'debug')
        self.assertEqual(5, len(apks))
        self.assertEqual('app-universal-debug.apk', apks[-1].name)

    def test_all_release_outputs(self):
        self.write_outputs('release')
        apks = apk_abis.verify_apks(self.directory, 'release')
        self.assertEqual(5, len(apks))
        self.assertEqual('app-universal-release.apk', apks[-1].name)

    def test_missing_split(self):
        self.write_outputs()
        (self.directory / 'app-x86-debug.apk').unlink()
        with self.assertRaises(FileNotFoundError):
            apk_abis.verify_apks(self.directory, 'debug')

    def test_missing_universal(self):
        self.write_outputs()
        (self.directory / 'app-universal-debug.apk').unlink()
        with self.assertRaises(FileNotFoundError):
            apk_abis.verify_apks(self.directory, 'debug')

    def test_wrong_split_abi(self):
        apk = self.write_apk('app-x86-debug.apk', {'x86_64'})
        with self.assertRaisesRegex(ValueError, 'expected ABIs'):
            apk_abis.verify_apk(apk, {'x86'})

    def test_split_has_multiple_abis(self):
        apk = self.write_apk('app-arm64-v8a-debug.apk', {'arm64-v8a', 'x86'})
        with self.assertRaisesRegex(ValueError, 'expected ABIs'):
            apk_abis.verify_apk(apk, {'arm64-v8a'})

    def test_universal_missing_abi(self):
        apk = self.write_apk('app-universal-debug.apk', set(apk_abis.ABIS) - {'armeabi-v7a'})
        with self.assertRaisesRegex(ValueError, 'expected ABIs'):
            apk_abis.verify_apk(apk, set(apk_abis.ABIS))

    def test_universal_has_extra_abi(self):
        apk = self.write_apk('app-universal-debug.apk', set(apk_abis.ABIS) | {'mips'})
        with self.assertRaisesRegex(ValueError, 'expected ABIs'):
            apk_abis.verify_apk(apk, set(apk_abis.ABIS))

    def test_missing_xray_library(self):
        apk = self.write_apk('app-x86-debug.apk', {'x86'}, library='libother.so')
        with self.assertRaisesRegex(ValueError, 'missing or empty lib/x86/libgojni.so'):
            apk_abis.verify_apk(apk, {'x86'})

    def test_empty_xray_library(self):
        apk = self.write_apk('app-x86-debug.apk', {'x86'}, payload=b'')
        with self.assertRaisesRegex(ValueError, 'missing or empty'):
            apk_abis.verify_apk(apk, {'x86'})

    def test_no_native_libraries(self):
        apk = self.write_apk('app-x86-debug.apk', set())
        with self.assertRaisesRegex(ValueError, 'expected ABIs'):
            apk_abis.verify_apk(apk, {'x86'})

    def test_invalid_zip(self):
        apk = self.directory / 'app-x86-debug.apk'
        apk.write_bytes(b'not an APK')
        with self.assertRaises(zipfile.BadZipFile):
            apk_abis.verify_apk(apk, {'x86'})

    def test_signed_release_filename_required(self):
        self.write_outputs('release-unsigned')
        with self.assertRaises(FileNotFoundError):
            apk_abis.verify_apks(self.directory, 'release')


if __name__ == '__main__':
    unittest.main(verbosity=2)
