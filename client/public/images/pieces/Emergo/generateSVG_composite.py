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
        '<path d="M95,85 v60"',
        # 2
        '<path d="M65,85 h30 v30 h-30 v30 h30"',
        # 3
        '<path d="M65,85 h30 v30 h-30 M95,115 v30 h-30"',
        # 4
        '<path d="M65,85 v30 h30 v30 M95,95 v30"',
        # 5
        '<path d="M95,85 h-30 v30 h30 v30 h-30"',
        # 6
        '<path d="M95,85 h-30 v60 h30 v-30 h-30"',
        # 7
        '<path d="M65,85 h30 v60"',
        # 8
        '<path d="M65,85 h30 v60 h-30 z M65,115 h30"',
        # 9
        '<path d="M65,145 h30 v-60 h-30 v30 h30"',
        # 10
        '<path d="M55,85 v60 M65,85 h30 v60 h-30 v-60"',
        # 11
        '<path d="M55,85 v60 M95,85 v60"',
        # 12
        '<path d="M55,85 v60 M65,85 h30 v30 h-30 v30 h30"'
    ],
    "right": [
        # 1
        '<path d="M185,85 v60"',
        # 2
        '<path d="M155,85 h30 v30 h-30 v30 h30"',
        # 3
        '<path d="M155,85 h30 v30 h-30 M185,115 v30 h-30"',
        # 4
        '<path d="M155,85 v30 h30 v30 M185,85 v30"',
        # 5
        '<path d="M185,85 h-30 v30 h30 v30 h-30"',
        # 6
        '<path d="M185,85 h-30 v60 h30 v-30 h-30"',
        # 7
        '<path d="M155,85 h30 v60"',
        # 8
        '<path d="M155,85 h30 v60 h-30 z M155,115 h30"',
        # 9
        '<path d="M155,145 h30 v-60 h-30 v30 h30"',
        # 10
        '<path d="M145,85 v60 M155,85 h30 v60 h-30 v-60"',
        # 11
        '<path d="M145,85 v60 M185,85 v60"',
        # 12
        '<path d="M145,85 v60 M155,85 h30 v30 h-30 v30 h30"'
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
            f.write(digits["left"][left] + ' fill="none" stroke-width="5" ' + ('stroke="red"' if colorLeft == "white" else 'stroke="orange"') + '/>')
            f.write("\n")
            f.write(digits["right"][right] + ' fill="none" stroke-width="5" ' + ('stroke="red"' if colorLeft == "black" else 'stroke="orange"') + '/>')
            f.write("\n")
            f.write(final)
            f.close()
