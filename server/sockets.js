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
	let clients = {}; //associative array client sid --> {socket, curPath}
	let pages = {}; //associative array path --> array of client sid
	// No-op function as a callback when sending messages
	const noop = () => { };
	wss.on("connection", (socket, req) => {
		const query = getJsonFromUrl(req.url);
		const sid = query["sid"];
		// Ignore duplicate connections (on the same live game that we play):
		if (!!clients[sid])
			return socket.send(JSON.stringify({code:"duplicate"}));
		// We don't know yet on which page the user will be
		clients[sid] = {socket: socket, path: ""};

//		socket.on("message", objtxt => {
//			let obj = JSON.parse(objtxt);
//			switch (obj.code)
//			{
//				case "enter":
//					if (clients[sid].path.length > 0)
//						remInArray(pages[clients[sid].path], sid);
//					clients[sid].path = obj.path;
//					pages[obj.path].push(sid);
//					// TODO also: notify "old" sub-room that I left (if it was not index)
//					if (obj.path == "/")
//					{
//						// Send counting info
//						let countings = {};
//						Object.keys(pages).forEach(
//							path => { countings[path] = pages[path].length; });
//						socket.send(JSON.stringify({code:"counts",counts:countings}));
//					}
//					else
//					{
//						// Send to every client connected on index an update message for counts
//						pages["/"].forEach((id) => {
//							clients[id].socket.send(
//								JSON.stringify({code:"increase",path:obj.path}), noop);
//						});
//						// TODO: do not notify anything in rules and problems sections (no socket required)
//						// --> in fact only /Atomic (main hall) and inside a game: /Atomic/392f3ju
//						// Also notify the (sub-)room (including potential opponents):
//						Object.keys(clients[page]).forEach( k => {
//							clients[page][k].send(JSON.stringify({code:"connect",id:sid}), noop);
//						});
//						// Finally, receive (sub-)room composition
//						// TODO.
//					}
//// NOTE: no "leave" counterpart (because it's always to enter somewhere else)
////				case "leave":
////					break;
//				// Transmit chats and moves to current room
//				// TODO: WebRTC instead in this case (most demanding?)
//				case "newchat":
//					if (!!clients[page][obj.oppid])
//					{
//						clients[page][obj.oppid].send(
//							JSON.stringify({code:"newchat",msg:obj.msg}), noop);
//					}
//					break;
//				case "newmove":
//					if (!!clients[page][obj.oppid])
//					{
//						clients[page][obj.oppid].send(
//							JSON.stringify({code:"newmove",move:obj.move}), noop);
//					}
//					break;
//
//
//				// TODO: generalize that for several opponents
//				case "ping":
//					if (!!clients[page][obj.oppid])
//						socket.send(JSON.stringify({code:"pong",gameId:obj.gameId}));
//					break;
//				case "lastate":
//					if (!!clients[page][obj.oppid])
//					{
//						const oppId = obj.oppid;
//						obj.oppid = sid; //I'm oppid for my opponent
//						clients[page][oppId].send(JSON.stringify(obj), noop);
//					}
//					break;
//				// TODO: moreover, here, game info should be sent (through challenge; not stored here)
//				case "newgame":
//					if (!!games[page])
//					{
//						// Start a new game
//						const oppId = games[page]["id"];
//						const fen = games[page]["fen"];
//						const gameId = games[page]["gameid"];
//						delete games[page];
//						const mycolor = (Math.random() < 0.5 ? 'w' : 'b');
//						socket.send(JSON.stringify(
//							{code:"newgame",fen:fen,oppid:oppId,color:mycolor,gameid:gameId}));
//						if (!!clients[page][oppId])
//						{
//							clients[page][oppId].send(
//								JSON.stringify(
//									{code:"newgame",fen:fen,oppid:sid,color:mycolor=="w"?"b":"w",gameid:gameId}),
//								noop);
//						}
//					}
//					else
//						games[page] = {id:sid, fen:obj.fen, gameid:obj.gameid}; //wait for opponent
//					break;
//				case "cancelnewgame": //if a user cancel his seek
//					// TODO: just transmit event
//					//delete games[page];
//					break;
//				// TODO: also other challenge events
//				case "resign":
//					if (!!clients[page][obj.oppid])
//						clients[page][obj.oppid].send(JSON.stringify({code:"resign"}), noop);
//					break;
//				// TODO: case "challenge" (get ID) --> send to all, "acceptchallenge" (with ID) --> send to all, "cancelchallenge" --> send to all
//				// also, "sendgame" (give current game info, if any) --> to new connections, "sendchallenges" (same for challenges) --> to new connections
//			}
//		});
//		socket.on("close", () => {
//			delete clients[sid];
//			// TODO: carefully delete pages[.........]
//			// + adapt below:
//			if (page != "/")
//			{
//				// Send to every client connected on index an update message for counts
//				Object.keys(clients["index"]).forEach( k => {
//					clients["index"][k].send(
//						JSON.stringify({code:"decrease",vid:page}), noop);
//				});
//			}
//			// Also notify potential opponents:
//			// hit all clients which check if sid corresponds
//			Object.keys(clients[page]).forEach( k => {
//				clients[page][k].send(JSON.stringify({code:"disconnect",id:sid}), noop);
//			});
//		});
	});
}
