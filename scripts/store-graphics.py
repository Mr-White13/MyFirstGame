"""
Builds the Google Play store graphics for NEON ESCAPE from the project's own assets.
Developer tool, run by hand:

    python scripts/store-graphics.py

Needs Pillow and a Chromium-based browser (Edge or Chrome; set BROWSER to its path if it isn't
found), like scripts/generate-icons.py, whose SVG renderer it reuses.

Outputs (release-assets/graphics/):
- icon-512.png              512 × 512 Play icon: the launcher icon artwork, full-bleed (Google Play
                            applies its own rounded mask, so no rounded tile is drawn), opaque.
- feature-graphic-1024x500.png  logo, game name and a crop of a REAL in-game screenshot
                            (release-assets/source/level30-board.png, captured on the Android
                            emulator from level 30). 24-bit PNG, no transparency.
"""

import base64
import importlib.util
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'resources' / 'logo' / 'neon-escape-mark.svg'
BOARD = ROOT / 'release-assets' / 'source' / 'level30-board.png'
OUT = ROOT / 'release-assets' / 'graphics'

_spec = importlib.util.spec_from_file_location('generate_icons', Path(__file__).with_name('generate-icons.py'))
icons = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(icons)


def full_bleed_logo(svg: str) -> str:
    """The logo with its background filling a slightly larger square (artwork inset for masks)."""
    lines = [l for l in svg.splitlines() if '<rect x="6' not in l]
    out = '\n'.join(lines).replace('viewBox="0 0 120 120"', 'viewBox="-10 -6 140 140"', 1)
    return out.replace(
        '</defs>',
        '</defs>\n  <rect x="-10" y="-6" width="140" height="140" fill="url(#tile)" />'
        '\n  <rect x="-10" y="-6" width="140" height="140" fill="url(#dots)" />',
        1,
    )


def render_html(html: str, width: int, height: int, work: Path, name: str) -> Image.Image:
    """Renders an HTML page to a width × height image with the headless browser."""
    import subprocess

    page = work / f'{name}.html'
    page.write_text(html, encoding='utf-8')
    png = work / f'{name}.png'
    subprocess.run(
        [
            icons.browser(), '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
            f'--user-data-dir={work / "profile"}', f'--screenshot={png}', f'--window-size={width},{height}', page.as_uri(),
        ],
        check=True, capture_output=True,
    )
    return Image.open(png).convert('RGB').crop((0, 0, width, height))


def feature_graphic_html(logo_svg: str, board_png: bytes) -> str:
    board = base64.b64encode(board_png).decode('ascii')
    logo = base64.b64encode(logo_svg.encode('utf-8')).decode('ascii')
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
  html, body {{ margin: 0; width: 1024px; height: 500px; overflow: hidden; }}
  body {{ background: radial-gradient(120% 140% at 20% 30%, #1b2540 0%, #101522 55%, #0b0f1a 100%);
          font-family: "Segoe UI", Roboto, system-ui, sans-serif; position: relative; }}
  .dots {{ position: absolute; inset: 0;
           background-image: radial-gradient(circle, rgba(155,168,188,.22) 1.4px, transparent 1.6px);
           background-size: 32px 32px; background-position: 8px 8px; }}
  .board {{ position: absolute; right: -10px; top: -40px; width: 470px; height: 580px;
            background: url(data:image/png;base64,{board}) center / cover no-repeat;
            -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 38%);
            mask-image: linear-gradient(90deg, transparent 0%, #000 38%); opacity: .95; }}
  .text {{ position: absolute; left: 64px; top: 0; bottom: 0; display: flex; align-items: center; gap: 34px; }}
  .logo {{ width: 168px; height: 168px; filter: drop-shadow(0 0 28px rgba(39,221,245,.35)); }}
  h1 {{ margin: 0; font-size: 74px; font-weight: 800; letter-spacing: .1em; line-height: 1.02;
        background: linear-gradient(90deg, #27ddf5 0%, #7a8bff 50%, #ff5ca8 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
        filter: drop-shadow(0 0 18px rgba(39,221,245,.25)); }}
  p {{ margin: 16px 0 0; color: #c9d3e6; font-size: 28px; letter-spacing: .02em; }}
</style></head><body>
  <div class="dots"></div>
  <div class="board"></div>
  <div class="text">
    <img class="logo" src="data:image/svg+xml;base64,{logo}" alt="">
    <div><h1>NEON<br>ESCAPE</h1><p>Free every arrow.</p></div>
  </div>
</body></html>"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    svg = LOGO.read_text(encoding='utf-8')
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        icon = icons.render(full_bleed_logo(svg), 1024, work, 'play-icon').convert('RGB').resize((512, 512), Image.LANCZOS)
        icon.save(OUT / 'icon-512.png', optimize=True)
        feature = render_html(feature_graphic_html(svg, BOARD.read_bytes()), 1024, 500, work, 'feature')
        feature.save(OUT / 'feature-graphic-1024x500.png', optimize=True)
    for name in ('icon-512.png', 'feature-graphic-1024x500.png'):
        with Image.open(OUT / name) as img:
            print(f'{name}: {img.size[0]}×{img.size[1]} {img.mode}, {(OUT / name).stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
