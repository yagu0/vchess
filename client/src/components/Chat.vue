<template lang="pug">
.row
  .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
    // TODO: Chat modal sur petit écran, dans la page pour grand écran
    .card.smallpad
      h4 Chat
      p(v-for="chat in chats" :class="classObject(chat)" v-html="chat.msg")
      input#inputChat(type="text" :placeholder="st.tr['Type here']"
        @keyup.enter="sendChat")
      button#sendChatBtn(@click="sendChat") {{ st.tr["Send"] }}
</template>

<script>
import { store } from "@/store";

export default {
  name: "my-chat",
  props: ["players"],
  data: function() {
    return {
      st: store.state,
      chats: [], //chat messages after human game
    };
  },
  created: function() {
    const socketMessageListener = msg => {
      const data = JSON.parse(msg.data);
      if (data.code == "newchat") //only event at this level
      {
        this.chats.push({msg:data.msg,
          name:data.name || "@nonymous", sid:data.sid});
      }
    };
    const socketCloseListener = () => {
      store.socketCloseListener(); //reinitialize connexion (in store.js)
      this.st.conn.addEventListener('message', socketMessageListener);
      this.st.conn.addEventListener('close', socketCloseListener);
    };
    this.st.conn.onmessage = socketMessageListener;
    this.st.conn.onclose = socketCloseListener;
  },
  methods: {
    classObject: function(chat) {
      return {
        "my-chatmsg": chat.sid == this.st.user.sid,
        "opp-chatmsg": this.players.some(
          p => p.sid == chat.sid && p.sid != this.st.user.sid)
      };
    },
    sendChat: function() {
      let chatInput = document.getElementById("inputChat");
      const chatTxt = chatInput.value;
      chatInput.value = "";
      const chat = {msg:chatTxt, name: this.st.user.name || "@nonymous",
        sid:this.st.user.sid};
      this.chats.push(chat);
      this.st.conn.send(JSON.stringify({
        code:"newchat", msg:chatTxt, name:chat.name}));
    },
  },
};
</script>

<style lang="sass">
.my-chatmsg
  color: grey
.opp-chatmsg
  color: black
</style>
