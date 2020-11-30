taille=64
convert wn.png -resize "$taille"x"$taille" wn_small.png
convert wb.png -resize "$taille"x"$taille" wb_small.png
convert bn.png -resize "$taille"x"$taille" bn_small.png
convert bb.png -resize "$taille"x"$taille" bb_small.png
# GIMP: manual fill by color (yellow/red). Then:
for color in w b; do
  for piece in r n b q k; do
    convert -composite -gravity center $color$piece.png "$color"n_small.png $color"$piece"_1.png
    convert -composite -gravity center $color$piece.png "$color"b_small.png $color"$piece"_2.png
  done
done
# Finally: manual renaming (TODO)
