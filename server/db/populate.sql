-- Re-run this script after variants are added

insert or ignore into Variants (name, description, noProblems) values
  ('Apocalypse', 'The end of the world', true),
  ('Chakart', 'Capture the princess', true),
  ('Dark', 'In the shadow', true),
  ('Dice', 'Roll the dice', true),
  ('Hidden', 'Unidentified pieces', true),
  ('Hiddenqueen', 'Queen disguised as a pawn', true),
  ('Synchrone', 'Play at the same time', true);

insert or ignore into Variants (name, description) values
  ('Absorption', 'Absorb powers'),
  ('Alice', 'Both sides of the mirror'),
  ('Allmate1', 'Mate any piece (v1)'),
  ('Allmate2', 'Mate any piece (v2)'),
  ('Ambiguous', 'Play opponent''s pieces'),
  ('Antiking1', 'Keep antiking in check (v1)'),
  ('Antiking2', 'Keep antiking in check (v2)'),
  ('Antimatter', 'Dangerous collisions'),
  ('Arena', 'Middle battle'),
  ('Atomic1', 'Explosive captures (v1)'),
  ('Atomic2', 'Explosive captures (v2)'),
  ('Ball', 'Score a goal'),
  ('Balaklava', 'Meet the Mammoth'),
  ('Baroque', 'Exotic captures'),
  ('Benedict', 'Change colors'),
  ('Berolina', 'Pawns move diagonally'),
  ('Bicolour', 'Harassed kings'),
  ('Bishopawns', 'Bishop versus pawns'),
  ('Cannibal', 'Capture powers'),
  ('Capture', 'Mandatory captures'),
  ('Castle', 'Win by castling long'),
  ('Checkered1', 'Shared pieces (v1)'),
  ('Checkered2', 'Shared pieces (v2)'),
  ('Checkless', 'No-check mode'),
  ('Chess960', 'Standard rules'),
  ('Circular', 'Run forward'),
  ('Clorange', 'A Clockwork Orange'),
  ('Colorbound', 'The colorbound clobberers'),
  ('Coregal', 'Two royal pieces'),
  ('Coronation', 'Long live the Queen'),
  ('Crazyhouse', 'Captures reborn'),
  ('Cylinder', 'Neverending rows'),
  ('Diamond', 'Rotating board'),
  ('Discoduel', 'Enter the disco'),
  ('Doublearmy', '64 pieces on the board'),
  ('Doublemove1', 'Double moves (v1)'),
  ('Doublemove2', 'Double moves (v2)'),
  ('Dynamo', 'Push and pull'),
  ('Eightpieces', 'Each piece is unique'),
  ('Empire', 'Empire versus Kingdom'),
  ('Enpassant', 'Capture en passant'),
  ('Evolution', 'Faster development'),
  ('Extinction', 'Capture all of a kind'),
  ('Football', 'Score a goal'),
  ('Forward', 'Moving forward'),
  ('Freecapture', 'Capture both colors'),
  ('Fullcavalry', 'Lancers everywhere'),
  ('Grand', 'Big board'),
  ('Grasshopper', 'Long jumps over pieces'),
  ('Gridolina', 'Jump the borders'),
  ('Hamilton', 'Walk on a graph'),
  ('Hoppelpoppel', 'Knibis and Bisknis'),
  ('Horde', 'A pawns cloud'),
  ('Interweave', 'Interweaved colorbound teams'),
  ('Isardam', 'No paralyzed pieces'),
  ('Janggi', 'Korean Chess'),
  ('Kinglet', 'Protect your pawns'),
  ('Knightmate', 'Mate the knight'),
  ('Knightpawns', 'Knight versus pawns'),
  ('Knightrelay1', 'Move like a knight (v1)'),
  ('Knightrelay2', 'Move like a knight (v2)'),
  ('Koopa', 'Stun & kick pieces'),
  ('Koth', 'King of the Hill'),
  ('Losers', 'Get strong at self-mate'),
  ('Madhouse', 'Rearrange enemy pieces'),
  ('Madrasi', 'Paralyzed pieces'),
  ('Magnetic', 'Laws of attraction'),
  ('Makpong', 'Thai Chess (v2)'),
  ('Makruk', 'Thai Chess (v1)'),
  ('Maxima', 'Occupy the enemy palace'),
  ('Minishogi', 'Shogi 5 x 5'),
  ('Minixiangqi', 'Xiangqi 7 x 7'),
  ('Monochrome', 'All of the same color'),
  ('Monster', 'White move twice'),
  ('Omega', 'A wizard in the corner'),
  ('Orda', 'Mongolian Horde (v1)'),
  ('Ordamirror', 'Mongolian Horde (v2)'),
  ('Pacifist1', 'Convert & support (v1)'),
  ('Pacifist2', 'Convert & support (v2)'),
  ('Pacosako', 'Dance with the King'),
  ('Parachute', 'Landing on the board'),
  ('Pawnmassacre', 'Pieces upside down'),
  ('Pawns', 'Reach the last rank (v1)'),
  ('Pawnsking', 'Reach the last rank (v2)'),
  ('Perfect', 'Powerful pieces'),
  ('Pocketknight', 'Knight in pocket'),
  ('Progressive1', 'Play more and more moves (v1)'),
  ('Progressive2', 'Play more and more moves (v2)'),
  ('Queenpawns', 'Queen versus pawns'),
  ('Racingkings', 'Kings cross the 8x8 board'),
  ('Rampage', 'Move under cover'),
  ('Rifle', 'Shoot pieces'),
  ('Recycle', 'Reuse pieces'),
  ('Rococo', 'Capture on the edge'),
  ('Rookpawns', 'Rook versus pawns'),
  ('Royalrace', 'Kings cross the 11x11 board'),
  ('Rugby', 'Transform an essay'),
  ('Schess', 'Seirawan-Harper Chess'),
  ('Shako', 'Non-conformism and utopia'),
  ('Shatranj', 'Ancient rules'),
  ('Shogi', 'Japanese Chess'),
  ('Sittuyin', 'Burmese Chess'),
  ('Suicide', 'Lose all pieces'),
  ('Suction', 'Attract opposite king'),
  ('Swap', 'Dangerous captures'),
  ('Switching', 'Exchange pieces'' positions'),
  ('Synochess', 'Dynasty versus Kingdom'),
  ('Takenmake', 'Prolongated captures'),
  ('Teleport', 'Reposition pieces'),
  ('Tencubed', 'Four new pieces'),
  ('Threechecks', 'Give three checks'),
  ('Titan', 'Extra bishops and knights'),
  ('Twokings', 'Two kings'),
  ('Upsidedown', 'Board upside down'),
  ('Vchess', 'Pawns capture backward'),
  ('Wildebeest', 'Balanced sliders & leapers'),
  ('Wormhole', 'Squares disappear'),
  ('Xiangqi', 'Chinese Chess'),
  ('Zen', 'Reverse captures');
