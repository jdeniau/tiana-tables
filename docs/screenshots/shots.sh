#!/usr/bin/env bash
# The README screenshots, from a running Storybook (`yarn storybook`), in
# headless Chromium. Each story is rendered at the device scale factor that
# gives the README's 2x width directly, so nothing is upscaled; the 16px
# Storybook padding is cropped away.
#
#   docs/screenshots/shots.sh
set -euo pipefail
cd "$(dirname "$0")"
SB=http://localhost:6006/iframe.html
PAD=16
CHROMIUM=${CHROMIUM:-chromium-browser}

# crop <file> <dsf> <css-width> <css-height>: drops the padding, keeps the story
crop() {
  python3 - "$@" <<'PY'
import sys
from PIL import Image
f, dsf, w, h = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
im = Image.open(f)
pad = round(16 * dsf)
im.crop((pad, pad, pad + round(w * dsf), pad + round(h * dsf))).save(f)
PY
}

# capture <file> <story> <theme> <css-width> <css-crop-height> <dsf> [css-window-height]
# the window height may exceed the crop when the story sizes itself in vh
capture() {
  local file=$1 story=$2 theme=$3 w=$4 h=$5 dsf=$6 wh=${7:-$(($5 + 2 * PAD))}
  "$CHROMIUM" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor="$dsf" --window-size="$((w + 2 * PAD)),$wh" \
    --virtual-time-budget=25000 --screenshot="$file" \
    "$SB?id=$story&viewMode=story&globals=theme:$theme" >/dev/null 2>&1
  crop "$file" "$dsf" "$w" "$h"
}

# hero: the grid, 1200 css px at 1.5 = 1800; the story is 90vh tall, a 608 px
# window gives 547 px of grid, cropped to the header + 20 whole rows = 546
capture hero.png component-tablegrid--default Dracula 1200 546 1.5 608

# chart: 980 css px at 1400/980
capture chart.png component-chart-chartpanel--default Dracula 980 430 1.4285714

# themes: two 560 css px captures at 1.25 = 700 each, side by side
capture themes-a.png component-tablegrid--default "Solarized%20Light" 560 380 1.25
capture themes-b.png component-tablegrid--default "Tokyo%20Night%20Dark" 560 380 1.25
python3 - <<'PY'
from PIL import Image
a, b = Image.open('themes-a.png'), Image.open('themes-b.png')
out = Image.new('RGB', (a.width + b.width, max(a.height, b.height)))
out.paste(a, (0, 0))
out.paste(b, (a.width, 0))
out.save('themes.png', optimize=True)
PY
rm themes-a.png themes-b.png

# sql-editor: the Primary story retyped up to `WHERE e.` so the suggest widget
# opens on the alias — driven through the devtools protocol, see the .mjs
"$CHROMIUM" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1.4 --window-size=1032,920 --remote-debugging-port=9340 \
  "$SB?id=component-monacoeditor-rawsqleditor--primary&viewMode=story&globals=theme:Dracula" >/dev/null 2>&1 &
CHROME=$!
sleep 8
node sql-editor-shot.mjs 9340 sql-editor.png 1.4 1000 322
kill "$CHROME"

for f in hero.png chart.png themes.png sql-editor.png; do
  python3 -c "from PIL import Image; im = Image.open('$f'); print('$f', im.size, im.mode)"
done
