from pathlib import Path
from PIL import Image

source = Path("/home/ubuntu/webdev-static-assets/planning-thionville-icon.png")
target_dir = Path("/home/ubuntu/resto-planning-mobile/assets/images")

with Image.open(source) as image:
    rgba = image.convert("RGBA")
    rgba.thumbnail((512, 512), Image.Resampling.LANCZOS)
    for name in ["icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png"]:
        rgba.save(target_dir / name, format="PNG", optimize=True, compress_level=9)
