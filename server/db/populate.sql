-- Re-run this script after variants are added

insert or ignore into Variants (name,description) values
  ('Alice', 'Both sides of the mirror'),
  ('Antiking', 'Keep antiking in check'),
  ('Atomic', 'Explosive captures'),
  ('Baroque', 'Exotic captures'),
  ('Berolina', 'Pawns move diagonally'),
  ('Checkered', 'Shared pieces'),
  ('Chess960', 'Standard rules'),
  ('Crazyhouse', 'Captures reborn'),
  ('Dark', 'In the shadow'),
  ('Extinction', 'Capture all of a kind'),
  ('Grand', 'Big board'),
  ('Losers', 'Lose all pieces'),
  ('Magnetic', 'Laws of attraction'),
  ('Marseille', 'Move twice'),
  ('Upsidedown', 'Board upside down'),
  ('Wildebeest', 'Balanced sliders & leapers'),
  ('Zen', 'Reverse captures');
