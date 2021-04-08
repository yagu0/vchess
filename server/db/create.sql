-- Database should be in this folder, and named 'vchess.sqlite'

create table Variants (
  id integer primary key,
  name varchar unique,
  display varchar,
  groupe integer,
  description text,
  noProblems boolean
);

create table Users (
  id integer primary key,
  name varchar unique,
  email varchar unique,
  loginToken varchar,
  loginTime datetime,
  sessionToken varchar,
  created datetime,
  notify boolean,
  bio text default ''
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

create table Challenges (
  id integer primary key,
  added datetime,
  uid integer,
  target integer,
  vid integer,
  options varchar,
  fen varchar,
  cadence varchar,
  foreign key (uid) references Users(id),
  foreign key (vid) references Variants(id)
);

create table GameStat (
  vid integer,
  total integer default 0,
  foreign key (vid) references Variants(id)
);

create table Games (
  id integer primary key,
  vid integer,
  fenStart varchar, --initial state
  fen varchar, --current state
  white integer,
  black integer,
  score varchar default '*',
  scoreMsg varchar,
  cadence varchar,
  options varchar, --for rematch
  created datetime,
  drawOffer character default '',
  rematchOffer character default '',
  deletedByWhite boolean,
  deletedByBlack boolean,
  chatReadWhite datetime,
  chatReadBlack datetime,
  foreign key (vid) references Variants(id),
  foreign key (white) references Users(id),
  foreign key (black) references Users(id)
);

create table Chats (
  gid integer,
  name varchar,
  msg varchar,
  added datetime
);

create table Moves (
  gid integer,
  squares varchar, --description, appear/vanish/from/to
  played datetime, --when was this move played?
  idx integer, --index of the move in the game
  foreign key (gid) references Games(id)
);

create index scoreIdx on Games(score);

pragma foreign_keys = on;
