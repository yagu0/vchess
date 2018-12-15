create table Variants (
	name varchar primary key,
	description text
);
insert into Variants values
	('Checkered', 'Shared pieces'),
	('Zen', 'Reverse captures'),
	('Atomic', 'Explosive captures'),
	('Chess960', 'Standard rules'),
	('Antiking', 'Keep antiking in check'),
	('Magnetic', 'Laws of attraction'),
	('Alice', 'Both sides of the mirror'),
	('Grand', 'Big board'),
	('Wildebeest', 'Balanced sliders & leapers'),
	('Loser', 'Lose all pieces'),
	('Crazyhouse', 'Captures reborn'),
	('Switching', 'Exchange pieces positions'),
	('Extinction', 'Capture all of a kind'),
	('Ultima', 'Exotic captures');

create table Problems (
	added datetime,
	variant varchar,
	fen varchar,
	instructions text,
	solution text,
	foreign key (variant) references Variants(name)
);
--PRAGMA foreign_keys = ON;
