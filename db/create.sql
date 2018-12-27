-- Database should be in this folder, and named 'vchess.sqlite'

create table Variants (
	name varchar primary key,
	description text
);

create table Problems (
	num integer primary key,
	added datetime,
	variant varchar,
	fen varchar,
	instructions text,
	solution text,
	foreign key (variant) references Variants(name)
);

PRAGMA foreign_keys = ON;
