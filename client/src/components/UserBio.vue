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
        div.buttons
          button(@click="toggleEdit()")
            | {{ st.tr[modeEdit ? "Cancel" : "Edit"] }}
          button(
            v-show="modeEdit"
            @click="sendBio()"
          )
            | {{ st.tr["Send"] }}
        fieldset(v-if="userBio !== undefined && modeEdit")
          textarea(
            @input="adjustHeight()"
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
        ?
          // No HTML tag
          txt.replace(/\n\n/g, "<br/><div class='br'></div>")
             .replace(/\n/g, "<br/>")
        : txt;
    },
    adjustHeight: function() {
      // https://stackoverflow.com/a/48460773
      let t = document.querySelector("#player_" + this.uid + " textarea");
      t.style.height = "";
      t.style.height = (t.scrollHeight + 3) + "px";
    },
    toggleEdit: function() {
      this.modeEdit = !this.modeEdit;
      if (this.modeEdit) this.$nextTick(this.adjustHeight);
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
      else if (this.modeEdit) this.adjustHeight();
    },
    sendBio: function() {
      this.modeEdit = false;
      ajax(
        "/userbio",
        "PUT",
        {
          data: { bio: this.userBio },
          success: () => {
            this.infoMsg = "Modifications applied!";
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
  p, ul, ol, pre, table, h3, h4, h5, h6, blockquote
    margin: var(--universal-margin) 0
  .br
    display: block
    margin: 10px 0
</style>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 500px
  max-height: 100%

.buttons
  text-align: center
  & > button
    margin-bottom: 0

h3
  text-align: center
  margin-bottom: 5px

textarea
  display: block
  margin: 0 var(--universal-margin)
  width: calc(100% - 2 * var(--universal-margin))
  min-height: 100px

.dialog
  padding: 5px
  color: blue
</style>
