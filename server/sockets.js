const url = require('url');

// Node version in Ubuntu 16.04 does not know about URL class
// NOTE: url is already transformed, without ?xxx=yyy... parts
function getJsonFromUrl(url) {
  const query = url.substr(2); //starts with "/?"
  let result = {};
  query.split("&").forEach((part) => {
    const item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

// Helper to safe-send some message through a (web-)socket:
function send(socket, message) {
  if (!!socket && socket.readyState == 1)
    socket.send(JSON.stringify(message));
}

module.exports = function(wss) {
  // Associative array page --> sid --> tmpId --> socket
  // "page" is either "/" for hall or "/game/some_gid" for Game,
  // tmpId is required if a same user (browser) has different tabs
  let clients = {};
  wss.on("connection", (socket, req) => {
    const query = getJsonFromUrl(req.url);
    const sid = query["sid"];
    const tmpId = query["tmpId"];
    const page = query["page"];
    const notifyRoom = (page,code,obj={}) => {
      if (!clients[page]) return;
      Object.keys(clients[page]).forEach(k => {
        Object.keys(clients[page][k]).forEach(x => {
          if (k == sid && x == tmpId) return;
          send(
            clients[page][k][x],
            Object.assign({code: code, from: sid}, obj)
          );
        });
      });
    };
    const deleteConnexion = () => {
      if (!clients[page] || !clients[page][sid] || !clients[page][sid][tmpId])
        return; //job already done
      delete clients[page][sid][tmpId];
      if (Object.keys(clients[page][sid]).length == 0) {
        delete clients[page][sid];
        if (Object.keys(clients[page]).length == 0)
          delete clients[page];
      }
    };

    const doDisconnect = () => {
      deleteConnexion();
      if (!clients[page] || !clients[page][sid]) {
        // I effectively disconnected from this page:
        notifyRoom(page, "disconnect");
        if (page.indexOf("/game/") >= 0)
          notifyRoom("/", "gdisconnect", {page:page});
      }
    };
    const messageListener = (objtxt) => {
      let obj = JSON.parse(objtxt);
      switch (obj.code) {
        // Wait for "connect" message to notify connection to the room,
        // because if game loading is slow the message listener might
        // not be ready too early.
        case "connect": {
          notifyRoom(page, "connect");
          if (page.indexOf("/game/") >= 0)
            notifyRoom("/", "gconnect", {page:page});
          break;
        }
        case "disconnect":
          // When page changes:
          doDisconnect();
          break;
        case "killme": {
          // Self multi-connect: manual removal + disconnect
          const doKill = (pg) => {
            Object.keys(clients[pg][obj.sid]).forEach(x => {
              send(clients[pg][obj.sid][x], {code: "killed"});
            });
            delete clients[pg][obj.sid];
          };
          const disconnectFromOtherConnexion = (pg,code,o={}) => {
            Object.keys(clients[pg]).forEach(k => {
              if (k != obj.sid) {
                Object.keys(clients[pg][k]).forEach(x => {
                  send(
                    clients[pg][k][x],
                    Object.assign({code: code, from: obj.sid}, o)
                  );
                });
              }
            });
          };
          Object.keys(clients).forEach(pg => {
            if (clients[pg][obj.sid]) {
              doKill(pg);
              disconnectFromOtherConnexion(pg, "disconnect");
              if (pg.indexOf("/game/") >= 0 && clients["/"])
                disconnectFromOtherConnexion("/", "gdisconnect", {page: pg});
            }
          });
          break;
        }
        case "pollclients": {
          // From Hall or Game
          let sockIds = [];
          Object.keys(clients[page]).forEach(k => {
            // Avoid polling myself: no new information to get
            if (k != sid) sockIds.push(k);
          });
          send(socket, {code: "pollclients", sockIds: sockIds});
          break;
        }
        case "pollclientsandgamers": {
          // From Hall
          let sockIds = [];
          Object.keys(clients["/"]).forEach(k => {
            // Avoid polling myself: no new information to get
            if (k != sid) sockIds.push({sid:k});
          });
          // NOTE: a "gamer" could also just be an observer
          Object.keys(clients).forEach(p => {
            if (p != "/") {
              Object.keys(clients[p]).forEach(k => {
                // 'page' indicator is needed for gamers
                if (k != sid) sockIds.push({sid:k, page:p});
              });
            }
          });
          send(socket, {code: "pollclientsandgamers", sockIds: sockIds});
          break;
        }

        // Asking something: from is fully identified,
        // but the requested resource can be from any tmpId (except current!)
        case "askidentity":
        case "asklastate":
        case "askchallenge":
        case "askgame":
        case "askfullgame": {
          const pg = obj.page || page; //required for askidentity and askgame
          // In cas askfullgame to wrong SID for example, would crash:
          if (!!clients[pg] && !!clients[pg][obj.target]) {
            const tmpIds = Object.keys(clients[pg][obj.target]);
            if (obj.target == sid) {
              // Targetting myself
              const idx_myTmpid = tmpIds.findIndex(x => x == tmpId);
              if (idx_myTmpid >= 0) tmpIds.splice(idx_myTmpid, 1);
            }
            const tmpId_idx = Math.floor(Math.random() * tmpIds.length);
            send(
              clients[pg][obj.target][tmpIds[tmpId_idx]],
              {code: obj.code, from: [sid,tmpId,page]}
            );
          }
          break;
        }

        // Some Hall events: target all tmpId's (except mine),
        case "refusechallenge":
        case "startgame":
          Object.keys(clients[page][obj.target]).forEach(x => {
            if (obj.target != sid || x != tmpId)
              send(
                clients[page][obj.target][x],
                {code: obj.code, data: obj.data}
              );
          });
          break;

        // Notify all room: mostly game events
        case "newchat":
        case "newchallenge":
        case "newgame":
        case "deletechallenge":
        case "resign":
        case "abort":
        case "drawoffer":
        case "draw":
          notifyRoom(page, obj.code, {data: obj.data});
          break;

        case "newmove": {
          const dataWithFrom = {from: [sid,tmpId], data: obj.data};
          // Special case re-send newmove only to opponent:
          if (!!obj.target && !!clients[page][obj.target]) {
            Object.keys(clients[page][obj.target]).forEach(x => {
              send(
                clients[page][obj.target][x],
                {code: "newmove", dataWithFrom}
              );
            });
          } else {
            // NOTE: data.from is useful only to opponent
            notifyRoom(page, "newmove", dataWithFrom);
          }
          break;
        }
        case "gotmove":
          if (
            !!clients[page][obj.target[0]] &&
            !!clients[page][obj.target[0]][obj.target[1]]
          ) {
            send(
              clients[page][obj.target[0]][obj.target[1]],
              {code: "gotmove", data: obj.data}
            );
          }
          break;

        case "result":
          // Special case: notify all, 'transroom': Game --> Hall
          notifyRoom("/", "result", {gid: obj.gid, score: obj.score});
          break;

        case "mconnect":
          // Special case: notify some game rooms that
          // I'm watching game state from MyGames
          // TODO: this code is ignored for now
          obj.gids.forEach(gid => {
            const pg = "/game/" + gid;
            Object.keys(clients[pg]).forEach(s => {
              Object.keys(clients[pg][s]).forEach(x => {
                send(
                  clients[pg][s][x],
                  {code: "mconnect", data: obj.data}
                );
              });
            });
          });
          break;
        case "mdisconnect":
          // TODO
          // Also TODO: pass newgame to MyGames, and gameover (result)
          break;

        // Passing, relaying something: from isn't needed,
        // but target is fully identified (sid + tmpId)
        case "challenge":
        case "fullgame":
        case "game":
        case "identity":
        case "lastate":
        {
          const pg = obj.target[2] || page; //required for identity and game
          // NOTE: if in game we ask identity to opponent still in Hall,
          // but leaving Hall, clients[pg] or clients[pg][target] could be undefined
          if (!!clients[pg] && !!clients[pg][obj.target[0]])
            send(clients[pg][obj.target[0]][obj.target[1]], {code:obj.code, data:obj.data});
          break;
        }
      }
    };
    const closeListener = () => {
      // For browser or tab closing (including page reload):
      doDisconnect();
    };
    // Update clients object: add new connexion
    if (!clients[page])
      clients[page] = {[sid]: {[tmpId]: socket}};
    else if (!clients[page][sid])
      clients[page][sid] = {[tmpId]: socket};
    else
      clients[page][sid][tmpId] = socket;
    socket.on("message", messageListener);
    socket.on("close", closeListener);
  });
}
