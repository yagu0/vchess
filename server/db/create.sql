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
  created datetime,
  notify boolean
);

create table Problems (
  id integer primary key,
  added datetime,
  fen varchar,
  uid integer,
  vid integer,
  instruction text,
  solution text,
  foreign key (uid) references Users(id),
  foreign key (vid) references Variants(id)
);

create table News (
  id integer primary key,
  uid integer,
  added datetime,
  content text,
  foreign key (uid) references Users(id)
);

create table Challenges (
  id integer primary key,
  added datetime,
  uid integer,
  target integer,
  vid integer,
  fen varchar,
  cadence varchar,
  foreign key (uid) references Users(id),
  foreign key (vid) references Variants(id)
);

create table Games (
  id integer primary key,
  vid integer,
  fenStart varchar, --initial state
  fen varchar, --current state
  score varchar,
  scoreMsg varchar,
  cadence varchar,
  created datetime,
  drawOffer character,
  foreign key (vid) references Variants(id)
);

create table Chats (
  gid integer,
  name varchar,
  msg varchar,
  added datetime
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
  played datetime, --when was this move played?
  idx integer, --index of the move in the game
  foreign key (gid) references Games(id)
);

pragma foreign_keys = on;
