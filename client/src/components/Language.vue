<template lang="pug">
div
  -
    var langName = {
      "en": "English",
      "es": "Español",
      "fr": "Français",
    };
  input#modalLang.modal(type="checkbox")
  div(role="dialog" data-checkbox="modalLang")
    #language.card
      label.modal-close(for="modalLang")
      form(@change="setLanguage")
        fieldset
          label(for="langSelect") {{ st.tr["Language"] }}
          select#langSelect
            each language,langCode in langName
              option(value=langCode)
                =language
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-language",
  data: function() {
    return {
      st: store.state,
    };
  },
  mounted: function() {
    // NOTE: better style would be in pug directly, but how?
    document.querySelectorAll("#langSelect > option").forEach(opt => {
      if (opt.value == this.st.lang)
        opt.selected = true;
    });
  },
  methods: {
    setLanguage: function(e) {
      localStorage["lang"] = e.target.value;
      store.setLanguage(e.target.value);
    },
	},
};
</script>
