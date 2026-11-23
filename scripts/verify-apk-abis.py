#!/usr/bin/env python3
"""Require four single-ABI APKs and one universal APK with their Xray JNI libraries."""
import argparse
from pathlib import Path
import zipfile

ABIS = ('arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86')


def verify_apk(apk, expected_abis):
    with zipfile.ZipFile(apk) as archive:
        native = {
            info.filename: info for info in archive.infolist()
            if info.filename.startswith('lib/') and info.filename.endswith('.so')
            and len(info.filename.split('/')) == 3
        }
        actual_abis = {name.split('/')[1] for name in native}
        if actual_abis != expected_abis:
            raise ValueError(f'{apk.name}: expected ABIs {sorted(expected_abis)}, found {sorted(actual_abis)}')
        for abi in sorted(expected_abis):
            name = f'lib/{abi}/libgojni.so'
            if name not in native or native[name].file_size == 0:
                raise ValueError(f'{apk.name}: missing or empty {name}')


def verify_apks(directory, build_type):
    apks = []
    for abi in (*ABIS, 'universal'):
        apk = directory / f'app-{abi}-{build_type}.apk'
        expected_abis = set(ABIS) if abi == 'universal' else {abi}
        verify_apk(apk, expected_abis)
        apks.append(apk)
    return apks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path, help='Gradle APK output directory')
    parser.add_argument('--build-type', choices=('debug', 'release'), required=True)
    args = parser.parse_args()
    try:
        apks = verify_apks(args.directory, args.build_type)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(1, f'APK ABI validation failed: {error}\n')
    for apk in apks:
        print(f'PASS: {apk}')


if __name__ == '__main__':
    main()
