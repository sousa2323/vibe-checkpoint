"""Regenerate Android launcher icons from the ChegaAi pin logo.

Foreground (adaptive, Android 8+): transparent canvas, pin centered at ~66% of canvas.
Legacy (Android < 8): white background + pin, square and round variants.

Run from the project root:  python scripts/gen_icons.py
"""
from PIL import Image, ImageDraw

SRC = "public/img/logo_chegaai2.png"
RES = "android/app/src/main/res"

# Adaptive foreground = full 108dp canvas at each density.
FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
# Legacy square icons.
LEG = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

# Fraction of the canvas height the pin should occupy (safe zone ~0.62-0.70).
SCALE = 0.66

src = Image.open(SRC).convert("RGBA")
logo = src.crop(src.getbbox())  # trim transparent margins


def scaled(target_h):
    w, h = logo.size
    nh = max(1, int(round(target_h)))
    nw = max(1, int(round(w * nh / h)))
    return logo.resize((nw, nh), Image.LANCZOS)


def centered(canvas_size, fill):
    c = Image.new("RGBA", (canvas_size, canvas_size), fill)
    p = scaled(canvas_size * SCALE)
    c.alpha_composite(p, ((canvas_size - p.width) // 2, (canvas_size - p.height) // 2))
    return c


# Foreground (transparent)
for d, s in FG.items():
    centered(s, (0, 0, 0, 0)).save(f"{RES}/mipmap-{d}/ic_launcher_foreground.png")

# Legacy square + round (white background)
for d, s in LEG.items():
    base = centered(s, (255, 255, 255, 255))
    base.convert("RGB").save(f"{RES}/mipmap-{d}/ic_launcher.png")

    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
    rnd = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    rnd.paste(base, (0, 0), mask)
    rnd.save(f"{RES}/mipmap-{d}/ic_launcher_round.png")

print("done")
