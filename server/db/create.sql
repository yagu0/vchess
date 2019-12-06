-- Database should be in this folder, and named 'vchess.sqlite'

create table Variants (
  id integer primary key,
  name varchar unique,
  description text
);

create table Users (
  id integer primary key,
  name varchar unique,
  email varchar unique,
  loginToken varchar,
  loginTime datetime,
  sessionToken varchar,
  notify boolean
);

create table Problems (
  id integer primary key,
  added datetime,
  uid integer,
  vid integer,
  fen varchar,
  instructions text,
  solution text,
  foreign key (uid) references Users(id),
  foreign key (vid) references Variants(id)
);

-- All the following tables are for correspondance play only
-- (Live games are stored in browser)

create table Challenges (
  id integer primary key,
  added datetime,
  uid integer,
  target integer,
  vid integer,
  fen varchar,
  timeControl varchar,
  foreign key (uid) references Users(id),
  foreign key (vid) references Variants(id)
);

-- NOTE: no need for a "created" field, it's deduced from first move playing time
create table Games (
  id integer primary key,
  vid integer,
  fenStart varchar, --initial state
  fen varchar, --current state
  score varchar,
  timeControl varchar,
  foreign key (vid) references Variants(id)
);

-- Store informations about players in a corr game
create table Players (
  gid integer,
  uid integer,
  color character,
  foreign key (gid) references Games(id),
  foreign key (uid) references Users(id)
);

create table Moves (
  gid integer,
  squares varchar, --description, appear/vanish/from/to
  message varchar,
  played datetime, --when was this move played?
  idx integer, --index of the move in the game
  color character, --required for e.g. Marseillais Chess
  foreign key (gid) references Games(id)
);

pragma foreign_keys = on;
