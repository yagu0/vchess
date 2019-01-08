			myname: localStorage["username"] || "anonymous",
			oppName: "anonymous", //opponent name, revealed after a game (if provided)
			chats: [], //chat messages after human game
		
	
	
		let chatEltsArray =
		[
			h('label',
				{
					attrs: { "id": "close-chat", "for": "modal-chat" },
					"class": { "modal-close": true },
				}
			),
			h('h3',
				{
					attrs: { "id": "titleChat" },
					"class": { "section": true },
					domProps: { innerHTML: translations["Chat with "] + this.oppName },
				}
			)
		];
		for (let chat of this.chats)
		{
			chatEltsArray.push(
				h('p',
					{
						"class": {
							"my-chatmsg": chat.author==this.myid,
							"opp-chatmsg": chat.author==this.oppid,
						},
						domProps: { innerHTML: chat.msg }
					}
				)
			);
		}
		chatEltsArray = chatEltsArray.concat([
			h('input',
				{
					attrs: {
						"id": "input-chat",
						type: "text",
						placeholder: translations["Type here"],
					},
					on: { keyup: this.trySendChat }, //if key is 'enter'
				}
			),
			h('button',
				{
					attrs: { id: "sendChatBtn"},
					on: { click: this.sendChat },
					domProps: { innerHTML: translations["Send"] },
				}
			)
		]);
		const modalChat = [
			h('input',
				{
					attrs: { "id": "modal-chat", type: "checkbox" },
					"class": { "modal": true },
				}),
			h('div',
				{
					attrs: { "role": "dialog", "aria-labelledby": "titleChat" },
				},
				[
					h('div',
						{
							"class": { "card": true, "smallpad": true },
						},
						chatEltsArray
					)
				]
			)
		];
		elementArray = elementArray.concat(modalChat);
	
	
				case "newchat":
					// Receive new chat
					this.chats.push({msg:data.msg, author:this.oppid});
					break;
				case "oppname":
					// Receive opponent's name
					this.oppName = data.name;
					break;
	
	
	// TODO: complete this component
		trySendChat: function(e) {
			if (e.keyCode == 13) //'enter' key
				this.sendChat();
		},
		sendChat: function() {
			let chatInput = document.getElementById("input-chat");
			const chatTxt = chatInput.value;
			chatInput.value = "";
			this.chats.push({msg:chatTxt, author:this.myid});
			this.conn.send(JSON.stringify({
				code:"newchat", oppid: this.oppid, msg: chatTxt}));
		},
		startChat: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			document.getElementById("modal-chat").checked = true;
		},

