<template lang="pug">
div
  input#inputChat(type="text" :placeholder="st.tr['Type here']"
    @keyup.enter="sendChat")
  button#sendChatBtn(@click="sendChat") {{ st.tr["Send"] }}
  p(v-for="chat in chats" :class="classObject(chat)"
    v-html="chat.name + ': ' + chat.msg")
  p(v-for="chat in pastChats" :class="classObject(chat)"
    v-html="chat.name + ': ' + chat.msg")
</template>

<script>
import { store } from "@/store";

export default {
  name: "my-chat",
  // Prop 'pastChats' for corr games where chats are on server
  props: ["players","pastChats","newChat"],
  data: function() {
    return {
      st: store.state,
      chats: [], //chat messages after human game
    };
  },
  watch: {
    newChat: function(chat) {
      if (chat.msg != "")
        this.chats.unshift({msg:chat.msg, name:chat.name || "@nonymous"});
    },
  },
  methods: {
    classObject: function(chat) {
      return {
        "my-chatmsg": chat.name == this.st.user.name,
        "opp-chatmsg": !!this.players && this.players.some(
          p => p.name == chat.name && p.name != this.st.user.name)
      };
    },
    sendChat: function() {
      let chatInput = document.getElementById("inputChat");
      const chatTxt = chatInput.value.trim();
      if (chatTxt == "")
        return; //nothing to send
      chatInput.value = "";
      const chat = {msg:chatTxt, name: this.st.user.name || "@nonymous"};
      this.$emit("mychat", chat);
      this.chats.unshift(chat);
    },
  },
};
</script>

<style lang="sass" scoped>
.my-chatmsg
  color: grey
.opp-chatmsg
  color: black
</style>
