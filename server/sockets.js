const url = require('url');

// Node version in Ubuntu 16.04 does not know about URL class
function getJsonFromUrl(url)
{
	const query = url.substr(2); //starts with "/?"
	let result = {};
	query.split("&").forEach((part) => {
		const item = part.split("=");
		result[item[0]] = decodeURIComponent(item[1]);
	});
	return result;
}

// Removal in array of strings (socket IDs)
function remInArray(arr, item)
{
	const idx = arr.indexOf(item);
	if (idx >= 0)
		arr.splice(idx, 1);
}

// TODO: empêcher multi-log du même user (envoyer le user ID + secret en même temps que name et...)
// --> si secret ne matche pas celui trouvé en DB, stop
// TODO: this file "in the end" would be much simpler, essentially just tracking connect/disconnect
// (everything else using WebRTC)
// TODO: lorsque challenge accepté, seul le dernier joueur à accepter envoi message "please start game"
// avec les coordonnées des participants. Le serveur renvoit alors les détails de la partie (couleurs, position)
//TODO: programmatic re-navigation on current game if we receive a move and are not there

module.exports = function(wss) {
	let clients = {}; //associative array client sid --> socket
	// No-op function as a callback when sending messages
	const noop = () => { };
	wss.on("connection", (socket, req) => {
		const query = getJsonFromUrl(req.url);
		const sid = query["sid"];
		// Ignore duplicate connections (on the same live game that we play):
		if (!!clients[sid])
			return socket.send(JSON.stringify({code:"duplicate"}));
		clients[sid] = socket;
		socket.on("message", objtxt => {
			let obj = JSON.parse(objtxt);
      if (!!obj.oppid && !clients[oppid])
        return; //receiver not connected, nothing we can do
			switch (obj.code)
			{
				// Transmit chats and moves to current room
				// TODO: WebRTC instead in this case (most demanding?)
				case "newchat":
          clients[obj.oppid].send(JSON.stringify({code:"newchat",msg:obj.msg}), noop);
					break;
				case "newmove":
          clients[obj.oppid].send(JSON.stringify({code:"newmove",move:obj.move}), noop);
					break;
				// TODO: generalize that for several opponents
				case "ping":
					socket.send(JSON.stringify({code:"pong",gameId:obj.gameId}));
					break;
				case "lastate":
          const oppId = obj.oppid;
          obj.oppid = sid; //I'm oppid for my opponent
          clients[oppId].send(JSON.stringify(obj), noop);
					break;
				// TODO: moreover, here, game info should be sent (through challenge; not stored here)
				case "newgame":
          clients[oppId].send(
            JSON.stringify(
              {code:"newgame",fen:fen,oppid:sid,color:"w",gameid:"TODO"}),
            noop);
					break;
				case "cancelnewgame": //if a user cancel his seek
					// TODO: just transmit event
					//delete games[page];
					break;
				// TODO: also other challenge events
				case "resign":
          clients[obj.oppid].send(JSON.stringify({code:"resign"}), noop);
					break;
				// TODO: case "challenge" (get ID) --> send to all, "acceptchallenge" (with ID) --> send to all, "cancelchallenge" --> send to all
				// also, "sendgame" (give current game info, if any) --> to new connections, "sendchallenges" (same for challenges) --> to new connections
        case "newchallenge":
          console.log("challenge received");
          console.log(obj.sender);
          console.log(obj);
          break;
			}
		});
		socket.on("close", () => {
			delete clients[sid];
      // Notify every other connected client
      Object.keys(clients).forEach( k => {
        clients[k].send(JSON.stringify({code:"disconnect",sid:sid}), noop);
      });
		});
	});
}
