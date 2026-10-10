"""Create reproducible installable ZIPs using only the Python standard library."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'extension/manifest.json').read_text())['version']
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)


def archive(name, entries):
    target = DIST / name
    with ZipFile(target, 'w', compression=ZIP_DEFLATED) as output:
        for source, destination in sorted(entries, key=lambda entry: entry[1]):
            info = ZipInfo(destination, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, source.read_bytes())
    return target


extension = sorted((ROOT / 'extension').glob('*'))
artifacts = [
    archive(f'snail-spoke-extension-{VERSION}.zip', [
        (file, file.name) for file in extension if file.is_file()
    ]),
    archive(f'snail-spoke-controller-{VERSION}.zip', [
        (file, 'snail-spoke-controller/' + str(file.relative_to(ROOT)))
        for file in [ROOT / 'README.md', ROOT / 'spoke/code.py', *extension]
        if file.is_file()
    ]),
]
(DIST / 'SHA256SUMS').write_text(''.join(
    f'{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}\n'
    for file in artifacts
))
for file in artifacts:
    print(file.relative_to(ROOT))
