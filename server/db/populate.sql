-- Re-run this script after variants are added

insert or ignore into Variants (name, description, noProblems, groupe, display) values
  ('Apocalypse', 'The end of the world', true, 13, 'Apocalypse'),
  ('Chakart', 'Capture the princess', true, 14, 'Chakart'),
  ('Dark', 'In the shadow', true, 13, 'Dark Chess'),
  ('Dice', 'Roll the dice', true, 14, 'Dice Chess'),
  ('Hidden', 'Unidentified pieces', true, 13, 'Strate-Go'),
  ('Hiddenqueen', 'Queen disguised as a pawn', true, 13, 'Hidden Queen'),
  ('Stealthbomb1', 'Beware the bomb (v1)', true, 13, 'Stealth Bomb 1'),
  ('Stealthbomb2', 'Beware the bomb (v2)', true, 13, 'Stealth Bomb 2'),
  ('Synchrone1', 'Play at the same time (v1)', true, 13, 'Synchrone 1'),
  ('Synchrone2', 'Play at the same time (v2)', true, 13, 'Synchrone 2');

insert or ignore into Variants (name, description, groupe, display) values
  ('Absorption', 'Absorb powers', 2, 'Absorption'),
  ('Alapo', 'Geometric Chess', 27, 'Alapo'),
  ('Alice', 'Both sides of the mirror', 31, 'Alice Chess'),
  ('Align4', 'Align four pawns', 31, 'Align4'),
  ('Allmate', 'Mate any piece', 11, 'Allmate'),
  ('Ambiguous', 'Play opponent''s pieces', 29, 'Ambiguous'),
  ('Antiking1', 'Keep antiking in check (v1)', 9, 'Anti-King 1'),
  ('Antiking2', 'Keep antiking in check (v2)', 9, 'Anti-King 2'),
  ('Antimatter', 'Dangerous collisions', 18, 'Antimatter'),
  ('Arena', 'Middle battle', 1, 'Arena'),
  ('Atarigo', 'First capture wins', 28, 'Atari-Go'),
  ('Atomic1', 'Explosive captures (v1)', 18, 'Atomic 1'),
  ('Atomic2', 'Explosive captures (v2)', 18, 'Atomic 2'),
  ('Avalam1', 'Build towers (v1)', 28, 'Avalam 1'),
  ('Avalam2', 'Build towers (v2)', 28, 'Avalam 2'),
  ('Avalanche', 'Pawnfalls', 24, 'Avalanche'),
  ('Ball', 'Score a goal', 6, 'Ball'),
  ('Balaklava', 'Meet the Mammoth', 15, 'Balaklava'),
  ('Bario', 'A quantum story', 31, 'Bario'),
  ('Baroque', 'Exotic captures', 11, 'Baroque'),
  ('Benedict', 'Change colors', 12, 'Benedict'),
  ('Berolina', 'Pawns move diagonally', 4, 'Berolina'),
  ('Bicolour', 'Harassed kings', 31, 'Bicolour'),
  ('Bishopawns', 'Bishop versus pawns', 0, 'Bishop-Pawns'),
  ('Brotherhood', 'Friendly pieces', 18, 'Brotherhood'),
  ('Cannibal1', 'Capture powers (v1)', 2, 'Cannibal 1'),
  ('Cannibal2', 'Capture powers (v2)', 2, 'Cannibal 2'),
  ('Capablanca', 'Capablanca Chess', 7, 'Capablanca Chess'),
  ('Capture', 'Mandatory captures', 1, 'Capture'),
  ('Castle', 'Win by castling long', 27, 'Castle'),
  ('Checkered', 'Shared pieces', 12, 'Checkered'),
  ('Checkless', 'No-check mode', 18, 'Checkless'),
  ('Chess960', 'Standard rules', -1, 'Chess960'),
  ('Circular', 'Run forward', 3, 'Circular Chess'),
  ('Clorange', 'A Clockwork Orange', 20, 'Clockwork Orange'),
  ('Convert', 'Convert enemy pieces', 12, 'Convert'),
  ('Copycat', 'Borrow powers', 30, 'Copycat'),
  ('Coregal', 'Two royal pieces', 9, 'Coregal'),
  ('Coronation', 'Long live the Queen', 17, 'Coronation'),
  ('Crazyhouse', 'Captures reborn', 20, 'Crazyhouse'),
  ('Crossing', 'Cross the river', 27, 'Crossing'),
  ('Cylinder', 'Neverending rows', 3, 'Cylindrical Chess'),
  ('Cwda', 'New teams', 5, 'Different armies'),
  ('Diamond', 'Rotating board', 4, 'Diamond'),
  ('Discoduel', 'Enter the disco', 0, 'Disco Duel'),
  ('Dobutsu', 'Let''s catch the Lion!', 0, 'Dobutsu'),
  ('Doublearmy', '64 pieces on the board', 16, 'Double Army'),
  ('Doublemove1', 'Double moves (v1)', 24, 'Doublemove 1'),
  ('Doublemove2', 'Double moves (v2)', 24, 'Doublemove 2'),
  ('Dynamo', 'Push and pull', 11, 'Dynamo'),
  ('Eightpieces', 'Each piece is unique', 7, '8 pieces'),
  ('Emergo', 'Stacking Checkers variant', 28, 'Emergo'),
  ('Empire', 'Empire versus Kingdom', 5, 'Empire Chess'),
  ('Enpassant', 'Capture en passant', 10, 'En-passant'),
  ('Evolution', 'Faster development', 31, 'Evolution'),
  ('Extinction', 'Capture all of a kind', 27, 'Extinction'),
  ('Fanorona', 'Malagasy Draughts', 28, 'Fanorona'),
  ('Football', 'Score a goal', 6, 'Football'),
  ('Forward', 'Moving forward', 31, 'Forward'),
  ('Freecapture', 'Capture both colors', 17, 'Free Capture'),
  ('Fugue', 'Baroque Music', 11, 'Fugue'),
  ('Fullcavalry', 'Lancers everywhere', 7, 'Full Cavalry'),
  ('Fusion', 'Fusion pieces (v1)', 31, 'Fusion Chess'),
  ('Gomoku', 'Align five stones', 28, 'Gomoku'),
  ('Grand', 'Big board', 7, 'Grand Chess'),
  ('Grasshopper', 'Long jumps over pieces', 7, 'Grasshopper'),
  ('Gridolina', 'Jump the borders', 31, 'Gridolina'),
  ('Hamilton', 'Walk on a graph', 31, 'Hamilton'),
  ('Hoppelpoppel', 'Knibis and Bisknis', 7, 'Hoppel-Poppel'),
  ('Horde', 'A pawns cloud', 5, 'Horde'),
  ('Hypnotic', 'Mind control (v1)', 21, 'Hypnotic'),
  ('Iceage', 'Ice Age is coming!', 31, 'Ice Age'),
  ('Interweave', 'Interweaved colorbound teams', 11, 'Interweave'),
  ('Isardam', 'No paralyzed pieces', 21, 'Isardam'),
  ('Janggi', 'Korean Chess', 22, 'Janggi'),
  ('Joker', 'Replace pieces', 26, 'Joker'),
  ('Karouk', 'Thai Chess (v3)', 22, 'Kar-Ouk'),
  ('Kinglet', 'Protect your pawns', 27, 'Kinglet'),
  ('Kingsmaker', 'Promote into kings', 31, 'Kingsmaker'),
  ('Knightmate1', 'Mate the knight (v1)', 15, 'Knightmate 1'),
  ('Knightmate2', 'Mate the knight (v2)', 15, 'Knightmate 2'),
  ('Knightpawns', 'Knight versus pawns', 0, 'Knight-Pawns'),
  ('Knightrelay1', 'Move like a knight (v1)', 15, 'Knightrelay 1'),
  ('Knightrelay2', 'Move like a knight (v2)', 15, 'Knightrelay 2'),
  ('Konane', 'Hawaiian Checkers', 28, 'Konane'),
  ('Koopa', 'Stun & kick pieces', 21, 'Koopa'),
  ('Koth', 'King of the Hill', 27, 'King of the Hill'),
  ('Losers', 'Get strong at self-mate', 1, 'Losers'),
  ('Madhouse', 'Rearrange enemy pieces', 20, 'Madhouse'),
  ('Madrasi', 'Paralyzed pieces', 21, 'Madrasi'),
  ('Magnetic', 'Laws of attraction', 31, 'Magnetic'),
  ('Maharajah', 'Augmented Queens', 25, 'Maharajah'),
  ('Makpong', 'Thai Chess (v2)', 22, 'Makpong'),
  ('Makruk', 'Thai Chess (v1)', 22, 'Makruk'),
  ('Maxima', 'Occupy the enemy palace', 11, 'Maxima'),
  ('Mesmer', 'Mind control (v2)', 21, 'Mesmer'),
  ('Minishogi', 'Shogi 5 x 5', 22, 'Minishogi'),
  ('Minixiangqi', 'Xiangqi 7 x 7', 22, 'Minixiangqi'),
  ('Monocolor', 'All of the same color', 1, 'Monocolor'),
  ('Monster', 'White move twice', 25, 'Monster'),
  ('Musketeer', 'New fairy pieces', 8, 'Musketeer Chess'),
  ('Newzealand', 'Kniros and Rosknis', 7, 'New-Zealand Chess'),
  ('Omega', 'A wizard in the corner', 7, 'Omega'),
  ('Orda', 'Mongolian Horde (v1)', 5, 'Orda'),
  ('Ordamirror', 'Mongolian Horde (v2)', 7, 'Orda Mirror'),
  ('Otage', 'Capture and release hostages', 12, 'Otage'),
  ('Pacifist1', 'Convert & support (v1)', 12, 'Pacifist 1'),
  ('Pacifist2', 'Convert & support (v2)', 12, 'Pacifist 2'),
  ('Pacosako', 'Dance with the King', 12, 'Paco-Sako'),
  ('Pandemonium1', 'Noise and confusion (v1)', 20, 'Pandemonium 1'),
  ('Pandemonium2', 'Noise and confusion (v2)', 20, 'Pandemonium 2'),
  ('Parachute', 'Landing on the board', 19, 'Parachute'),
  ('Pawnmassacre', 'Pieces upside down', 16, 'Pawn Massacre'),
  ('Pawns', 'Reach the last rank (v1)', 0, 'Pawns'),
  ('Pawnsking', 'Reach the last rank (v2)', 0, 'Pawns & King'),
  ('Perfect', 'Powerful pieces', 7, 'Perfect Chess'),
  ('Pocketknight', 'Knight in pocket', 17, 'Pocket Knight'),
  ('Progressive1', 'Play more and more moves (v1)', 24, 'Progressive 1'),
  ('Progressive2', 'Play more and more moves (v2)', 24, 'Progressive 2'),
  ('Queenpawns', 'Queen versus pawns', 0, 'Queen-Pawns'),
  ('Racingkings', 'Kings cross the 8x8 board', 23, 'Racing Kings'),
  ('Rampage', 'Move under cover', 20, 'Rampage'),
  ('Relayup', 'Upgrade pieces', 30, 'Relay-up'),
  ('Rifle', 'Shoot pieces', 10, 'Rifle Chess'),
  ('Recycle', 'Reuse pieces', 20, 'Recycle Chess'),
  ('Refusal1', 'Do not play that! (v1)', 29, 'Refusal 1'),
  ('Refusal2', 'Do not play that! (v2)', 29, 'Refusal 2'),
  ('Rollerball', 'As in the movie', 31, 'Rollerball'),
  ('Rococo', 'Capture on the edge', 11, 'Rococo'),
  ('Rookpawns', 'Rook versus pawns', 0, 'Rook-Pawns'),
  ('Royalrace', 'Kings cross the 11x11 board', 23, 'Royal Race'),
  ('Rugby', 'Transform an essay', 6, 'Rugby'),
  ('Schess', 'Seirawan-Harper Chess', 8, 'Seirawan-Harper Chess'),
  ('Screen', 'Free initial setup', 19, 'Screen Chess'),
  ('Selfabsorb', 'Fusion pieces (v2)', 31, 'Self-Absorption'),
  ('Shako', 'Non-conformism and utopia', 7, 'Shako'),
  ('Shatranj', 'Ancient rules', 22, 'Shatranj'),
  ('Shinobi', 'A story of invasion', 5, 'Shinobi'),
  ('Shogi', 'Japanese Chess', 22, 'Shogi'),
  ('Shogun', 'General''s Chess', 20, 'Shogun'),
  ('Sittuyin', 'Burmese Chess', 22, 'Sittuyin'),
  ('Spartan', 'Spartan versus Persians', 5, 'Spartan Chess'),
  ('Squatter1', 'Squat last rank (v1)', 27, 'Squatter 1'),
  ('Squatter2', 'Squat last rank (v2)', 27, 'Squatter 2'),
  ('Suicide', 'Lose all pieces', 1, 'Suicide'),
  ('Suction', 'Attract opposite king', 26, 'Suction'),
  ('Swap', 'Dangerous captures', 26, 'Swap'),
  ('Switching', 'Exchange pieces'' positions', 26, 'Switching'),
  ('Synochess', 'Dynasty versus Kingdom', 5, 'Synochess'),
  ('Takenmake', 'Prolongated captures', 31, 'Take and make'),
  ('Teleport1', 'Reposition pieces (v1)', 20, 'Teleport 1'),
  ('Teleport2', 'Reposition pieces (v2)', 20, 'Teleport 2'),
  ('Tencubed', 'Four new pieces', 7, 'Tencubed'),
  ('Threechecks', 'Give three checks', 27, 'Three Checks'),
  ('Titan', 'Extra bishops and knights', 8, 'Titan Chess'),
  ('Twokings', 'Two kings', 9, 'Two Kings'),
  ('Upsidedown', 'Board upside down', 16, 'Upside-down'),
  ('Vchess', 'Pawns capture backward', 4, 'Victor Chess'),
  ('Wildebeest', 'Balanced sliders & leapers', 7, 'Wildebeest'),
  ('Wormhole1', 'Squares disappear (v1)', 31, 'Wormhole 1'),
  ('Wormhole2', 'Squares disappear (v2)', 31, 'Wormhole 2'),
  ('Xiangqi', 'Chinese Chess', 22, 'Xiangqi'),
  ('Yote', 'African Draughts', 28, 'Yote'),
  ('Zen', 'Reverse captures', 10, 'Zen Chess');
