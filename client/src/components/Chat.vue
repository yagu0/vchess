<template lang="pug">
div
  button(@click="clearHistory()")
    | {{ st.tr["Clear history"] }}
  input#inputChat(
    type="text"
    :placeholder="st.tr['Chat here']"
    @keyup.enter="sendChat()"
  )
  button(@click="sendChat()") {{ st.tr["Send"] }}
  p(v-for="chat in chats.concat(pastChats)")
    span.name {{ chat.name }} :&nbsp;
    span(
      :class="classObject(chat)"
      v-html="chat.msg"
    )
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-chat",
  // Prop 'pastChats' for corr games where chats are on server
  props: ["players", "pastChats"],
  data: function() {
    return {
      st: store.state,
      chats: [] //chat messages after human game
    };
  },
  methods: {
    classObject: function(chat) {
      return {
        "my-chatmsg": chat.name == this.st.user.name,
        "opp-chatmsg":
          !!this.players &&
          this.players.some(
            p => p.name == chat.name && p.name != this.st.user.name
          )
      };
    },
    sendChat: function() {
      let chatInput = document.getElementById("inputChat");
      const chatTxt = chatInput.value.trim();
      chatInput.focus(); //required on smartphones
      if (chatTxt == "") return; //nothing to send
      chatInput.value = "";
      const chat = { msg: chatTxt, name: this.st.user.name || "@nonymous" };
      this.$emit("mychat", chat);
      this.chats.unshift(chat);
    },
    newChat: function(chat) {
      if (chat.msg != "")
        this.chats.unshift({ msg: chat.msg, name: chat.name || "@nonymous" });
    },
    clearHistory: function() {
      this.chats = [];
      this.$emit("chatcleared");
    }
  }
};
</script>

<style lang="sass" scoped>
.name
  color: #abb2b9

.my-chatmsg
  color: #7d3c98
.opp-chatmsg
  color: #2471a3
</style>
