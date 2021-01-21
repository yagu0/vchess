#!/usr/bin/env python

# Compose each piece SVG with numbers
# https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
# https://developer.mozilla.org/fr/docs/Web/SVG/Tutoriel/Paths

preamble = """<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="230" height="230">"""

black = '<circle cx="115" cy="115" r="100" fill="crimson" stroke="darkslategray"/>'
white = '<circle cx="115" cy="115" r="100" fill="gold" stroke="darkslategray"/>'

digits = [
    # 1
    '<path d="M130,85 v60"',
    # 2
    '<path d="M100,85 h30 v30 h-30 v30 h30"',
    # 3
    '<path d="M100,85 h30 v30 h-30 M130,115 v30 h-30"',
    # 4
    '<path d="M100,85 v30 h30 v30 M130,85 v30"',
    # 5
    '<path d="M130,85 h-30 v30 h30 v30 h-30"'
]

final = "</svg>"

for color in ["white", "black"]:
    for number in range(5):
        filename = ('w' if color == "white" else 'b') + chr(97 + number + 1) + ".svg"
        f = open(filename, "w")
        f.write(preamble)
        f.write("\n")
        f.write(white if color == "white" else black)
        f.write("\n")
        f.write(digits[number] + ' fill="none" stroke-width="5" ' + ('stroke="red"' if color == "white" else 'stroke="yellow"') + '/>')
        f.write("\n")
        f.write(final)
        f.close()
