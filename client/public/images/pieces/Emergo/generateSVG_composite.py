#!/usr/bin/env python

# Compose each piece SVG with numbers
# https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
# https://developer.mozilla.org/fr/docs/Web/SVG/Tutoriel/Paths

preamble = """<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="230" height="230">
<defs>
  <mask id="stripe">
    <rect x="0" y="0" width="230" height="230" fill="white"/>
    <rect x="130" y="0" width="90" height="230"/>
  </mask>
</defs>"""

black_left = '<circle cx="115" cy="115" r="100" fill="black" stroke="orange" mask="url(#stripe)"/>'
white_right = '<circle cx="115" cy="115" r="100" fill="whitesmoke"/>'
white_left = '<circle cx="115" cy="115" r="100" fill="whitesmoke" stroke="orange" mask="url(#stripe)"/>'
black_right = '<circle cx="115" cy="115" r="100" fill="black"/>'

digits = {
    "left": [
        # 1
        '<path d="M90,95 v40"',
        # 2
        '<path d="M70,95 h20 v20 h-20 v20 h20"',
        # 3
        '<path d="M70,95 h20 v20 h-20 M90,115 v20 h-20"',
        # 4
        '<path d="M70,95 v20 h20 v20 M90,95 v20"',
        # 5
        '<path d="M90,95 h-20 v20 h20 v20 h-20"',
        # 6
        '<path d="M90,95 h-20 v40 h20 v-20 h-20"',
        # 7
        '<path d="M70,95 h20 v40"',
        # 8
        '<path d="M70,95 h20 v40 h-20 z M70,115 h20"',
        # 9
        '<path d="M70,135 h20 v-40 h-20 v20 h20"',
        # 10
        '<path d="M60,95 v40 M70,95 h20 v40 h-20 v-40"',
        # 11
        '<path d="M60,95 v40 M90,95 v40"',
        # 12
        '<path d="M60,95 v40 M70,95 h20 v20 h-20 M90,115 v20 h-20"'
    ],
    "right": [
        # 1
        '<path d="M180,95 v40"',
        # 2
        '<path d="M160,95 h20 v20 h-20 v20 h20"',
        # 3
        '<path d="M160,95 h20 v20 h-20 M180,115 v20 h-20"',
        # 4
        '<path d="M160,95 v20 h20 v20 M180,95 v20"',
        # 5
        '<path d="M180,95 h-20 v20 h20 v20 h-20"',
        # 6
        '<path d="M180,95 h-20 v40 h20 v-20 h-20"',
        # 7
        '<path d="M160,95 h20 v40"',
        # 8
        '<path d="M160,95 h20 v40 h-20 z M160,115 h20"',
        # 9
        '<path d="M160,135 h20 v-40 h-20 v20 h20"',
        # 10
        '<path d="M150,95 v40 M160,95 h20 v40 h-20 v-40"',
        # 11
        '<path d="M150,95 v40 M180,95 v40"',
        # 12
        '<path d="M150,95 v40 M160,95 h20 v20 h-20 M180,115 v20 h-20"'
    ]
}

final = "</svg>"

for colorLeft in ["white", "black"]:
    chrShift = 0 if colorLeft == "white" else 32
    for left in range(12):
        for right in range(12):
            filename = chr(65 + left + chrShift) + chr(65 + right + chrShift) + ".svg"
            f = open(filename, "w")
            f.write(preamble)
            f.write("\n")
            f.write(black_right if colorLeft == "white" else white_right)
            f.write("\n")
            f.write(white_left if colorLeft == "white" else black_left)
            f.write("\n")
            f.write(digits["left"][left] + ' fill="none" stroke-width="4" ' + ('stroke="red"' if colorLeft == "white" else 'stroke="orange"') + '/>')
            f.write("\n")
            f.write(digits["right"][right] + ' fill="none" stroke-width="4" ' + ('stroke="red"' if colorLeft == "black" else 'stroke="orange"') + '/>')
            f.write("\n")
            f.write(final)
            f.close()
