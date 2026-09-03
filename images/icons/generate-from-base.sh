convert icon-base.png -resize 1024x1024 icon.png
convert icon-base.png -resize 512x512 icon.icns
convert icon-base.png -resize 1024x1024 icon@2x.icns
convert icon-base.png -resize 256x256 icon.ico

# hicolor sizes for the flatpak, which appstreamcli looks up by name
convert icon-base.png -resize 128x128 icon-128.png
convert icon-base.png -resize 256x256 icon-256.png
convert icon-base.png -resize 512x512 icon-512.png
