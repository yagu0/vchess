taille=64
for color in w b; do
  [[ $color = 'w' ]] && oppCol='b' || oppCol='w'
  for captured in p r n b q k; do
    convert $color$captured.png -resize "$taille"x"$taille" $color"$captured"_small.png
    for piece in p r n b q k; do
      convert -composite -gravity center $oppCol$piece.png $color"$captured"_small.png $color$captured$piece.png
    done
  done
done
# Finally: manual renaming (TODO)
