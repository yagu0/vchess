<template lang="pug">
div
  input#inputChat(type="text" :placeholder="st.tr['Type here']"
    @keyup.enter="sendChat")
  button#sendChatBtn(@click="sendChat") {{ st.tr["Send"] }}
  p(v-for="chat in pastChats" :class="classObject(chat)"
    v-html="chat.name + ': ' + chat.msg")
  p(v-for="chat in chats" :class="classObject(chat)"
    v-html="chat.name + ': ' + chat.msg")
</template>

<script>
import { store } from "@/store";

export default {
  name: "my-chat",
  // Prop 'pastChats' for corr games where chats are on server
  props: ["players","pastChats"],
  data: function() {
    return {
      st: store.state,
      chats: [], //chat messages after human game
    };
  },
  created: function() {
    const curMsgListener = this.st.conn.onmessage; //from Game or Hall
    const socketMessageListener = msg => {
      curMsgListener(msg);
      const data = JSON.parse(msg.data);
      if (data.code == "newchat") //only event at this level
      {
        this.chats.unshift({msg:data.msg, name:data.name || "@nonymous"});
        this.$emit("newchat-received"); //data not required here
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
        "my-chatmsg": chat.name == this.st.user.name,
        "opp-chatmsg": this.players.some(
          p => p.name == chat.name && p.name != this.st.user.name)
      };
    },
    sendChat: function() {
      let chatInput = document.getElementById("inputChat");
      const chatTxt = chatInput.value;
      chatInput.value = "";
      const chat = {msg:chatTxt, name: this.st.user.name || "@nonymous"};
      this.$emit("newchat-sent", chat); //useful for corr games
      this.chats.unshift(chat);
      this.st.conn.send(JSON.stringify({
        code:"newchat", msg:chatTxt, name:chat.name}));
    },
  },
};
</script>

<style lang="sass" scoped>
.my-chatmsg
  color: grey
.opp-chatmsg
  color: black
#chat
  max-width: 100%
</style>
