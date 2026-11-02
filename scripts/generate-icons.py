"""
Generates the Android launcher icons and the web favicon from the logo mark
(resources/logo/neon-escape-mark.svg). Developer tool, run by hand after
changing the logo:

    python scripts/generate-icons.py

Needs Pillow and a Chromium-based browser for rendering the SVG (Microsoft
Edge or Google Chrome; set BROWSER to its path if it isn't found). The SVG is
rendered once at 1024 px and scaled down with a high-quality filter.

Outputs:
- android/app/src/main/res/mipmap-*/ic_launcher.png         the whole tile (Android 7 and older)
- android/app/src/main/res/mipmap-*/ic_launcher_round.png   the tile cropped to a circle
- android/app/src/main/res/mipmap-*/ic_launcher_foreground.png  arrows only, inside the
  adaptive-icon safe zone (Android 8+ masks it; the background is @color/ic_launcher_background)
- public/favicon.png (and favicon.svg is the logo itself, copied)
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'resources' / 'logo' / 'neon-escape-mark.svg'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

# Launcher icon sizes per density (dp 48), and adaptive foreground sizes (dp 108).
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

BROWSERS = [
    os.environ.get('BROWSER', ''),
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
]


def browser() -> str:
    for path in BROWSERS:
        if path and Path(path).exists():
            return path
    sys.exit('No Chromium-based browser found: set BROWSER to Edge or Chrome.')


def render(svg_text: str, size: int, work: Path, name: str) -> Image.Image:
    """Renders SVG markup to a transparent RGBA image of size × size."""
    svg = work / f'{name}.svg'
    svg.write_text(svg_text, encoding='utf-8')
    html = work / f'{name}.html'
    html.write_text(
        f"<html><body style='margin:0;background:transparent'>"
        f"<img src='{svg.as_uri()}' style='width:{size}px;height:{size}px;display:block'></body></html>",
        encoding='utf-8',
    )
    png = work / f'{name}.png'
    subprocess.run(
        [
            browser(), '--headless=new', '--disable-gpu', '--hide-scrollbars',
            f'--user-data-dir={work / "profile"}', '--default-background-color=00000000',
            f'--screenshot={png}', f'--window-size={size},{size}', html.as_uri(),
        ],
        check=True, capture_output=True,
    )
    return Image.open(png).convert('RGBA')


def foreground_svg(tile_svg: str) -> str:
    """The arrows alone, shrunk into the adaptive icon's safe zone (the tile becomes the background colour)."""
    lines = [l for l in tile_svg.splitlines() if '<rect x="6' not in l]
    out = '\n'.join(lines)
    # The arrows span about x 30–96, y 1–96 of the 120-unit canvas: a 180-unit view centred on
    # them (63, 48) shows them at 2/3 size, inside the safe zone (66 of 108 dp).
    return out.replace('viewBox="0 0 120 120"', 'viewBox="-27 -42 180 180"', 1)


def save(img: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path, optimize=True)


def main() -> None:
    tile_svg = LOGO.read_text(encoding='utf-8')
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        tile = render(tile_svg, 1024, work, 'tile')
        fore = render(foreground_svg(tile_svg), 1024, work, 'foreground')

    mask = Image.new('L', tile.size, 0)
    ImageDraw.Draw(mask).ellipse((40, 40, tile.size[0] - 40, tile.size[1] - 40), fill=255)
    round_icon = Image.new('RGBA', tile.size, (0, 0, 0, 0))
    round_icon.paste(tile, (0, 0), mask)

    for density, scale in DENSITIES.items():
        folder = RES / f'mipmap-{density}'
        save(tile, folder / 'ic_launcher.png', round(48 * scale))
        save(round_icon, folder / 'ic_launcher_round.png', round(48 * scale))
        save(fore, folder / 'ic_launcher_foreground.png', round(108 * scale))

    save(tile, ROOT / 'public' / 'favicon.png', 64)
    shutil.copyfile(LOGO, ROOT / 'public' / 'favicon.svg')
    print('Icons written for', ', '.join(DENSITIES), 'and public/favicon.{png,svg}')


if __name__ == '__main__':
    main()
