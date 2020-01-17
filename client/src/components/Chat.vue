<template lang="pug">
div
  div
    .card.smallpad
      h4 Chat
      p(v-for="chat in chats" :class={
        "my-chatmsg": "chat.uid==user.id",
        "opp-chatmsg": "opponents.any(o => o.id == chat.uid)"}
        v-html="chat.msg")
      input#inputChat(type="text" placeholder="st.tr['Type here']"
        @keyup.enter="sendChat")
      button#sendChatBtn(@click="sendChat") {{ st.tr["Send"] }}
</template>

<script>
// TODO: myname, opponents (optional, different style), people
// --> also show messages like "X offers draw" ?
export default {
  name: "my-chat",
  props: ["opponents","people"],
  data: function() {
    return {
      chats: [], //chat messages after human game
    };
  },
//  // TODO: Chat modal sur petit écran, dans la page pour grand écran
//  created: function() {
//    const socketMessageListener = msg => {
//      const data = JSON.parse(msg.data);
//      switch (data.code)
//      {
//        case "newchat":
//          // TODO: new chat just arrived: data contain all informations
//          // (uid, name, message; no need for timestamp, we can use local time here)
//          this.chats.push({msg:data.msg, author:this.oppid});
//          break;
//        // TODO: distinguish these (dis)connect events from their analogs in game.js
//        // TODO: implement and harmonize: opponents and people are arrays, not objects ?!
//        case "connect":
//          this.players.push({name:data.name, id:data.uid});
//          break;
//        case "disconnect":
//          const pIdx = this.players.findIndex(p => p.id == data.uid);
//          this.players.splice(pIdx);
//          break;
//      }
//    };
//    const socketCloseListener = () => {
//      this.conn.addEventListener('message', socketMessageListener);
//      this.conn.addEventListener('close', socketCloseListener);
//    };
//    this.conn.onmessage = socketMessageListener;
//    this.conn.onclose = socketCloseListener;
//  },
//  methods: {
//    // TODO: complete this component
//    sendChat: function() {
//      let chatInput = document.getElementById("input-chat");
//      const chatTxt = chatInput.value;
//      chatInput.value = "";
//      this.chats.push({msg:chatTxt, author:this.myid});
//      this.conn.send(JSON.stringify({
//        code:"newchat", oppid: this.oppid, msg: chatTxt}));
//    },
////    startChat: function(e) {
////      document.getElementById("modal-chat").checked = true;
////    },
  },
});
