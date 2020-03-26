#!/bin/sh

# Restore binary files (temporary fix - should use git-fat instead)
for color in "w" "b"; do
  for piece in "b" "c" "d" "e" "f" "g" "h" "j" "k" "m" "n" "o" "p" "q" "r" "s"; do
    rm -f public/images/pieces/Eightpieces/tmp_png/"$color$piece".png
    wget -q -O public/images/pieces/Eightpieces/tmp_png/"$color$piece".png https://vchess.club/images/pieces/Eightpieces/tmp_png/"$color$piece".png
  done
done
for image in "Orda" "Archer" "Lancer" "Kheshig" "Yurt"; do
  rm -f /public/images/variants/Orda/"$image".png
  wget -q -O public/images/variants/Orda/"$image".png https://vchess.club/images/variants/Orda/"$image".png
done
rm -f public/sounds/newgame.flac
wget -q -O public/sounds/newgame.flac https://vchess.club/sounds/newgame.flac
rm -f public/favicon.ico
wget -q -O public/favicon.ico https://vchess.club/favicon.ico
