"""Render RoadGuard's code-defined mark. Regenerate with Python and Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'assets'
SCALE = 3

def mark(background, foreground, size=1024):
    image = Image.new('RGBA', (size * SCALE, size * SCALE), background)
    draw = ImageDraw.Draw(image)
    def point(x, y):
        return (int(x / 1024 * size * SCALE), int(y / 1024 * size * SCALE))
    # Shield and central road markings; no stock artwork or font dependency.
    shield = [(340, 330), (512, 280), (684, 330), (684, 480), (672, 554),
              (642, 616), (591, 670), (512, 724), (433, 670), (382, 616),
              (352, 554), (340, 480), (340, 330)]
    draw.line([point(x, y) for x, y in shield], fill=foreground, width=int(24 / 1024 * size * SCALE), joint='curve')
    for y in (385, 500):
        draw.rounded_rectangle([point(499, y), point(525, y + 70)], radius=int(5 / 1024 * size * SCALE), fill=foreground)
    return image.resize((size, size), Image.Resampling.LANCZOS)

mark('#16735A', '#FFFFFF').save(OUT / 'icon.png')
mark((0, 0, 0, 0), '#16735A').save(OUT / 'android-icon-foreground.png')
mark((0, 0, 0, 0), '#000000').save(OUT / 'android-icon-monochrome.png')
mark((0, 0, 0, 0), '#16735A', 64).save(OUT / 'favicon.png')
mark((0, 0, 0, 0), '#16735A', 256).save(OUT / 'splash-icon.png')
