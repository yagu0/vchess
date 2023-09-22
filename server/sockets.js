const { Client, GatewayIntentBits } = require('discord.js');
const { token, channel } = require('./config/discord.json');

// Node version in Ubuntu 16.04 does not know about URL class
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
  // or "/mygames" for Mygames page (simpler: no 'people' array).
  // tmpId is required if a same user (browser) has different tabs
  let clients = {};
  // NOTE: only purpose of sidToPages = know when to delete keys in idToSid
  let sidToPages = {};
  let idToSid = {};
  const discordClient = new Client(
    { intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  let discordChannel = null;
  if (token.length > 0) {
    discordClient.login(token);
    discordClient.once("ready", () => {
      discordChannel = discordClient.channels.cache.get(channel);
    });
  }
  wss.on("connection", (socket, req) => {
    const query = getJsonFromUrl(req.url);
    const sid = query["sid"];
    const id = query["id"];
    const tmpId = query["tmpId"];
    const page = query["page"];
    const notifyRoom = (page, code, obj={}, except) => {
      if (!clients[page]) return;
      except = except || [];
      Object.keys(clients[page]).forEach(k => {
        if (except.includes(k)) return;
        Object.keys(clients[page][k]).forEach(x => {
          if (k == sid && x == tmpId) return;
          send(
            clients[page][k][x].socket,
            Object.assign({ code: code, from: [sid, tmpId] }, obj)
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
        const pgIndex = sidToPages[sid].findIndex(pg => pg == page);
        sidToPages[sid].splice(pgIndex, 1);
        if (Object.keys(clients[page]).length == 0)
          delete clients[page];
        // Am I totally offline?
        if (sidToPages[sid].length == 0) {
          delete sidToPages[sid];
          delete idToSid[id];
        }
      }
    };

    const doDisconnect = () => {
      deleteConnexion();
      // Nothing to notify when disconnecting from MyGames page:
      if (page != "/mygames") {
        notifyRoom(page, "disconnect");
        if (page.indexOf("/game/") >= 0)
          notifyRoom("/", "gdisconnect", { page: page });
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
            notifyRoom("/", "gconnect", { page: page });
          break;
        }
        case "disconnect":
          // When page changes:
          doDisconnect();
          break;
        case "pollclients": {
          // From Game
          let sockIds = {};
          Object.keys(clients[page]).forEach(k => {
            sockIds[k] = {};
            Object.keys(clients[page][k]).forEach(x => {
              // Avoid polling my tmpId: no information to get
              if (k != sid || x != tmpId)
                sockIds[k][x] = { focus: clients[page][k][x].focus };
            });
          });
          send(socket, { code: "pollclients", sockIds: sockIds });
          break;
        }
        case "pollclientsandgamers": {
          // From Hall
          let sockIds = {};
          Object.keys(clients["/"]).forEach(k => {
            sockIds[k] = {};
            Object.keys(clients[page][k]).forEach(x => {
              // Avoid polling my tmpId: no information to get
              if (k != sid || x != tmpId) {
                sockIds[k][x] = {
                  page: "/",
                  focus: clients[page][k][x].focus
                };
              }
            });
          });
          // NOTE: a "gamer" could also just be an observer
          Object.keys(clients).forEach(p => {
            if (p.indexOf("/game/") >= 0) {
              Object.keys(clients[p]).forEach(k => {
                if (!sockIds[k]) sockIds[k] = {};
                Object.keys(clients[p][k]).forEach(x => {
                  if (k != sid || x != tmpId) {
                    sockIds[k][x] = {
                      page: p,
                      focus: clients[p][k][x].focus
                    };
                  }
                });
              });
            }
          });
          send(socket, { code: "pollclientsandgamers", sockIds: sockIds });
          break;
        }

        // Asking something: from is fully identified,
        // but the requested resource can be from any tmpId (except current!)
        case "askidentity":
        case "asklastate":
        case "askchallenges":
        case "askgame": {
          const pg = obj.page || page; //required for askidentity and askgame
          if (!!clients[pg] && !!clients[pg][obj.target]) {
            let tmpIds = Object.keys(clients[pg][obj.target]);
            if (obj.target == sid) {
              // Targetting myself
              const idx_myTmpid = tmpIds.findIndex(x => x == tmpId);
              if (idx_myTmpid >= 0) tmpIds.splice(idx_myTmpid, 1);
            }
            if (tmpIds.length > 0) {
              const ttmpId = tmpIds[Math.floor(Math.random() * tmpIds.length)];
              send(
                clients[pg][obj.target][ttmpId].socket,
                { code: obj.code, from: [sid,tmpId,page] }
              );
            }
          }
          break;
        }

        // Special situation of the previous "case":
        // Full game can be asked to any observer.
        case "askfullgame": {
          if (!!clients[page]) {
            let sids = Object.keys(clients[page]).filter(k => k != sid);
            if (sids.length > 0) {
              // Pick a SID at random in this set, and ask full game:
              const rid = sids[Math.floor(Math.random() * sids.length)];
              // ..to a random tmpId:
              const tmpIds = Object.keys(clients[page][rid]);
              const rtmpId = tmpIds[Math.floor(Math.random() * tmpIds.length)];
              send(
                clients[page][rid][rtmpId].socket,
                { code: "askfullgame", from: [sid,tmpId] }
              );
            } else {
              // I'm the only person who have the game for the moment:
              send(socket, { code: "fullgame", data: { empty: true } });
            }
          }
          break;
        }

        // Some Hall events: target all tmpId's (except mine),
        case "refusechallenge":
        case "startgame":
          Object.keys(clients[page][obj.target]).forEach(x => {
            if (obj.target != sid || x != tmpId)
              send(
                clients[page][obj.target][x].socket,
                { code: obj.code, data: obj.data }
              );
          });
          break;

        // Notify all room: mostly game events
        case "newchat":
        case "newchallenge":
        case "deletechallenge_s":
        case "newgame":
        case "resign":
        case "abort":
        case "drawoffer":
        case "rematchoffer":
        case "draw":
          // "newgame" message can provide a page (corr Game --> Hall)
          if (obj.code == "newchallenge") {
            // Filter out targeted challenges and correspondance games:
            if (!obj.data.to && obj.data.cadence.indexOf('d') < 0) {
              const challMsg = (
                (obj.data.sender || "@nonymous") + " : " +
                "**" + obj.data.vname + "** " +
                "[" + obj.data.cadence + "] "
              );
              if (!!discordChannel) discordChannel.send(challMsg);
              else
                // Log when running locally (dev, debug):
                console.log(challMsg);
            }
            delete obj.data["sender"];
          }
          notifyRoom(
            obj.page || page, obj.code, {data: obj.data}, obj.excluded);
          break;

        case "rnewgame":
          // A rematch game started:
          notifyRoom(page, "newgame", {data: obj.data});
          // Explicitely notify Hall if gametype == corr.
          // Live games will be polled from Hall after gconnect event.
          if (obj.data.cadence.indexOf('d') >= 0)
            notifyRoom("/", "newgame", {data: obj.data});
          break;

        case "newmove": {
          const dataWithFrom = { from: [sid,tmpId], data: obj.data };
          // Special case re-send newmove only to opponent:
          if (!!obj.target && !!clients[page][obj.target]) {
            Object.keys(clients[page][obj.target]).forEach(x => {
              send(
                clients[page][obj.target][x].socket,
                Object.assign({ code: "newmove" }, dataWithFrom)
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
              clients[page][obj.target[0]][obj.target[1]].socket,
              { code: "gotmove" }
            );
          }
          break;

        case "result":
          // Special case: notify all, 'transroom': Game --> Hall
          notifyRoom("/", "result", { gid: obj.gid, score: obj.score });
          break;

        case "mabort": {
          const gamePg = "/game/" + obj.gid;
          if (!!clients[gamePg] && !!clients[gamePg][obj.target]) {
            Object.keys(clients[gamePg][obj.target]).forEach(x => {
              send(
                clients[gamePg][obj.target][x].socket,
                { code: "abort" }
              );
            });
          }
          break;
        }

        case "notifyscore":
        case "notifyturn":
        case "notifynewgame":
          if (!!clients["/mygames"]) {
            obj.targets.forEach(t => {
              const k = t.sid || idToSid[t.id];
              if (!!clients["/mygames"][k]) {
                Object.keys(clients["/mygames"][k]).forEach(x => {
                  send(
                    clients["/mygames"][k][x].socket,
                    { code: obj.code, data: obj.data }
                  );
                });
              }
            });
          }
          break;

        case "getfocus":
        case "losefocus":
          if (
            !!clients[page] &&
            !!clients[page][sid] &&
            !!clients[page][sid][tmpId]
          ) {
            clients[page][sid][tmpId].focus = (obj.code == "getfocus");
          }
          if (page == "/") notifyRoom("/", obj.code, { page: "/" }, [sid]);
          else {
            // Notify game room + Hall:
            notifyRoom(page, obj.code, {}, [sid]);
            notifyRoom("/", obj.code, { page: page }, [sid]);
          }
          break;

        // Passing, relaying something: from isn't needed,
        // but target is fully identified (sid + tmpId)
        case "challenges":
        case "fullgame":
        case "game":
        case "identity":
        case "lastate":
        {
          const pg = obj.target[2] || page; //required for identity and game
          // NOTE: if in game we ask identity to opponent still in Hall, but
          // leaving Hall, clients[pg] or clients[pg][target] could be undef.
          if (!!clients[pg] && !!clients[pg][obj.target[0]]) {
            send(
              clients[pg][obj.target[0]][obj.target[1]].socket,
              { code:obj.code, data:obj.data }
            );
          }
          break;
        }
      }
    };
    const closeListener = () => {
      // For browser or tab closing (including page reload):
      doDisconnect();
    };
    // Update clients object: add new connexion
    const newElt = { socket: socket, focus: true };
    if (!clients[page])
      clients[page] = { [sid]: {[tmpId]: newElt } };
    else if (!clients[page][sid])
      clients[page][sid] = { [tmpId]: newElt };
    else
      clients[page][sid][tmpId] = newElt;
    // Also update helper correspondances
    if (!idToSid[id]) idToSid[id] = sid;
    if (!sidToPages[sid]) sidToPages[sid] = [];
    const pgIndex = sidToPages[sid].findIndex(pg => pg == page);
    if (pgIndex === -1) sidToPages[sid].push(page);
    socket.on("message", messageListener);
    socket.on("close", closeListener);
  });
}
