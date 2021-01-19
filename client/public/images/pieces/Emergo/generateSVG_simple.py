#!/usr/bin/env python

# Compose each piece SVG with numbers
# https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
# https://developer.mozilla.org/fr/docs/Web/SVG/Tutoriel/Paths

preamble = """<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="230" height="230">"""

black = '<circle cx="115" cy="115" r="100" fill="black" stroke="orange"/>'
white = '<circle cx="115" cy="115" r="100" fill="whitesmoke" stroke="orange"/>'

digits = [
    # 1
    '<path d="M125,95 v40" stroke="red" fill="none" stroke-width="2"/>',
    # 2
    '<path d="M105,95 h20 v20 h-20 v20 h20" stroke="red" fill="none" stroke-width="2"/>',
    # 3
    '<path d="M105,95 h20 v20 h-20 M125,115 v20 h-20" stroke="red" fill="none" stroke-width="2"/>',
    # 4
    '<path d="M105,95 v20 h20 v20 M125,95 v20" stroke="red" fill="none" stroke-width="2"/>',
    # 5
    '<path d="M125,95 h-20 v20 h20 v20 h-20" stroke="red" fill="none" stroke-width="2"/>',
    # 6
    '<path d="M125,95 h-20 v40 h20 v-20 h-20" stroke="red" fill="none" stroke-width="2"/>',
    # 7
    '<path d="M105,95 h20 v40" stroke="red" fill="none" stroke-width="2"/>',
    # 8
    '<path d="M105,95 h20 v40 h-20 z M105,115 h20" stroke="red" fill="none" stroke-width="2"/>',
    # 9
    '<path d="M105,135 h20 v-40 h-20 v20 h20" stroke="red" fill="none" stroke-width="2"/>',
    # 10
    '<path d="M100,95 v40 M110,95 h20 v40 h-20 v-40" stroke="red" fill="none" stroke-width="2"/>',
    # 11
    '<path d="M100,95 v40 M130,95 v40" stroke="red" fill="none" stroke-width="2"/>',
    # 12
    '<path d="M100,95 v40 M110,95 h20 v20 h-20 M130,115 v20 h-20" stroke="red" fill="none" stroke-width="2"/>'
]

final = "</svg>"

for color in ["white", "black"]:
    chrShift = 0 if color == "white" else 32
    for number in range(12):
        filename = chr(65 + number + chrShift) + "_.svg"
        f = open(filename, "w")
        f.write(preamble)
        f.write("\n");
        f.write(white if color == "white" else black)
        f.write("\n");
        f.write(digits[number])
        f.write("\n");
        f.write(final)
        f.close()
