<!-- TODO: component Game, + handle players + observers connect/disconnect
  event = "gameconnect" ...etc
  connect/disconnect with sid+name (ID not required); name slightly redundant but easier

quand on arrive dans la partie, on poll les sids pour savoir qui est en ligne (ping)
(éventuel échange lastate avec les connectés, pong ...etc)
ensuite quand qqun se deco il suffit d'écouter "disconnect"
pareil quand quelqu'un reco.
(c'est assez rudimentaire et écoute trop de messages, mais dans un premier temps...)
-->
