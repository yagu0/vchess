<template lang="pug">
div(:id="'player_' + uid")
  input.modal(
    :id="'modalBio_' + uid"
    type="checkbox"
  )
  div.bio-div(
    role="dialog"
    :data-checkbox="'modalBio_' + uid"
  )
    .card
      div(v-if="st.user.id == uid")
        div
          button(@click="modeEdit = !modeEdit")
            | {{ st.tr[modeEdit ? "Cancel" : "Edit"] }}
          button(
            v-show="modeEdit"
            @click="sendBio()"
          )
            | {{ st.tr["Send"] }}
        fieldset(v-if="userBio !== undefined && modeEdit")
          textarea(
            @input="adjustHeight($event)"
            v-model="userBio"
          )
      h3 {{ uname }}
      .bio-content(
        v-if="userBio !== undefined"
        v-html="parseHtml(userBio)"
        @click="modeEdit = !modeEdit"
      )
      .dialog.text-center {{ st.tr[infoMsg] }}
  span(
    :class="{ clickable: !!uname }"
    @click="showBio()"
  )
    | {{ uname || "@nonymous" }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
import { processModalClick } from "@/utils/modalClick.js";
export default {
  name: "my-user-bio",
  props: ["uid", "uname"],
  data: function() {
    return {
      st: store.state,
      userBio: undefined,
      infoMsg: "",
      modeEdit: false
    };
  },
  methods: {
    parseHtml: function(txt) {
      return !txt.match(/<[/a-zA-Z]+>/)
        ? txt.replace(/\n/g, "<br/>") //no HTML tag
        : txt;
    },
    adjustHeight: function(e) {
      // https://stackoverflow.com/a/48460773
      let t = e.target;
      t.style.height = "";
      t.style.height = t.scrollHeight + "px";
    },
    showBio: function() {
      if (!this.uname)
        // Anonymous users have no bio:
        return;
      this.infoMsg = "";
      document.querySelector("#modalBio_" + this.uid).checked = true;
      if (this.userBio === undefined) {
        ajax(
          "/userbio",
          "GET",
          {
            data: { id: this.uid },
            success: (res) => {
              this.userBio = res.bio;
            }
          }
        );
        document.querySelector("#player_" + this.uid + " > .bio-div")
          .addEventListener("click", processModalClick);
      }
    },
    sendBio: function() {
      ajax(
        "/userbio",
        "PUT",
        {
          data: { bio: this.userBio },
          success: () => {
            this.infoMsg = this.st.tr["Modifications applied!"];
          }
        }
      );
    }
  }
};
</script>

<style lang="sass">
// bio-content HTML elements are added after initial rendering
.bio-content
  text-align: left
  margin: 0 var(--universal-margin)
  p, ul, ol
    margin: var(--universal-margin) 0
</style>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 500px
  max-height: 100%

textarea
  display: block
  margin: 0 var(--universal-margin)
  width: calc(100% - 2 * var(--universal-margin))
  min-height: 100px

.dialog
  padding: 5px
  color: blue
</style>
