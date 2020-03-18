#!/bin/sh

# Restore binary files (temporary fix - should use git-fat instead)
rsync -a https://vchess.club/images/pieces/Eightpieces/tmp_png/ client/public/images/pieces/Eightpieces/tmp_png/
scp https://vchess.club/sounds/newgame.flac client/public/sounds/
scp https://vchess.club/favicon.ico client/public/
