color=w
for piece in p r n b q k; do
  convert "$color""$piece".png -crop 100x128+0+0 "$color""$piece"_.png
done
color=b
for piece in p r n b q k; do
  convert "$color""$piece".png -crop 100x128+28+0 "$color""$piece"_.png
done
for p1 in p r n b q k; do
  for p2 in p r n b q k; do
    convert +append w"$p1"_.png b"$p2"_.png out_"$p1""$p2".png
    convert out_"$p1""$p2".png -resize 128x128\! res_"$p1""$p2".png
  done
done
# Finally: manual renaming + cleaning (TODO)
