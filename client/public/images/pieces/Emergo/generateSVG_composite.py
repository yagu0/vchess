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
    <rect x="0" y="115" width="230" height="115"/>
  </mask>
</defs>"""

black_top = '<circle cx="115" cy="115" r="100" fill="black" mask="url(#stripe)"/>'
white_bottom = '<circle cx="115" cy="115" r="100" fill="whitesmoke" stroke="saddlebrown"/>'
white_top = '<circle cx="115" cy="115" r="100" fill="whitesmoke" stroke="saddlebrown" mask="url(#stripe)"/>'
black_bottom = '<circle cx="115" cy="115" r="100" fill="black"/>'

digits = {
    "top": [
        # 1 (unused here)
        '<path d="M130,35 v60"',
        # 2
        '<path d="M100,35 h30 v30 h-30 v30 h30"',
        # 3
        '<path d="M100,35 h30 v30 h-30 M130,65 v30 h-30"',
        # 4
        '<path d="M100,35 v30 h30 v30 M130,35 v30"',
        # 5
        '<path d="M130,35 h-30 v30 h30 v30 h-30"',
        # 6
        '<path d="M130,35 h-30 v60 h30 v-30 h-30"',
        # 7
        '<path d="M100,35 h30 v60"',
        # 8
        '<path d="M100,35 h30 v60 h-30 z M100,65 h30"',
        # 9
        '<path d="M100,95 h30 v-60 h-30 v30 h30"',
        # 10
        '<path d="M90,35 v60 M100,35 h30 v60 h-30 v-60"',
        # 11
        '<path d="M90,35 v60 M130,35 v60"',
        # 12
        '<path d="M90,35 v60 M100,35 h30 v30 h-30 v30 h30"'
    ],
    "bottom": [
        # 1 (unused here)
        '<path d="M130,135 v60"',
        # 2
        '<path d="M100,135 h30 v30 h-30 v30 h30"',
        # 3
        '<path d="M100,135 h30 v30 h-30 M130,165 v30 h-30"',
        # 4
        '<path d="M100,135 v30 h30 v30 M130,135 v30"',
        # 5
        '<path d="M130,135 h-30 v30 h30 v30 h-30"',
        # 6
        '<path d="M130,135 h-30 v60 h30 v-30 h-30"',
        # 7
        '<path d="M100,135 h30 v60"',
        # 8
        '<path d="M100,135 h30 v60 h-30 z M100,165 h30"',
        # 9
        '<path d="M100,195 h30 v-60 h-30 v30 h30"',
        # 10
        '<path d="M90,135 v60 M100,135 h30 v60 h-30 v-60"',
        # 11
        '<path d="M90,135 v60 M130,135 v60"',
        # 12
        '<path d="M90,135 v60 M100,135 h30 v30 h-30 v30 h30"'
    ]
}

final = "</svg>"

for colorTop in ["white", "black"]:
    chrShift = 0 if colorTop == "white" else 32
    for top in range(12):
        for bottom in range(12):
            filename = chr(65 + top + chrShift) + chr(65 + bottom + chrShift) + ".svg"
            f = open(filename, "w")
            f.write(preamble)
            f.write("\n")
            f.write(black_bottom if colorTop == "white" else white_bottom)
            f.write("\n")
            f.write(white_top if colorTop == "white" else black_top)
            f.write("\n")
            if top >= 1:
                f.write(digits["top"][top] + ' fill="none" stroke-width="5" ' + ('stroke="red"' if colorTop == "white" else 'stroke="orange"') + '/>')
                f.write("\n")
            if bottom >= 1:
                f.write(digits["bottom"][bottom] + ' fill="none" stroke-width="5" ' + ('stroke="red"' if colorTop == "black" else 'stroke="orange"') + '/>')
                f.write("\n")
            f.write(final)
            f.close()
