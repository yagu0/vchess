//TODO: new problem form + problem visualisation, like Game.vue (but simpler)
// --> mode analyze, moves = [], "load problem"
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<input type="checkbox" id="modal-newproblem" class="modal"/>
			<div role="dialog" aria-labelledby="modalProblemTxt">
				<div v-show="!modalProb.preview" class="card newproblem-form">
					<label for="modal-newproblem" class="modal-close">
					</label>
					<h3 id="modalProblemTxt">{{ translate("Add a problem") }}</h3>
					<form @submit.prevent="previewProblem()">
						<fieldset>
							<label for="newpbFen">FEN</label>
							<input id="newpbFen" type="text" v-model="modalProb.fen"
								:placeholder='translate("Full FEN description")'/>
						</fieldset>
						<fieldset>
							<p class="emphasis">{{ translate("Safe HTML tags allowed") }}</p>
							<label for="newpbInstructions">{{ translate("Instructions") }}</label>
							<textarea id="newpbInstructions" v-model="modalProb.instructions"
								:placeholder='translate("Describe the problem goal")'>
							</textarea>
							<label for="newpbSolution">{{ translate("Solution") }}</label>
							<textarea id="newpbSolution" v-model="modalProb.solution"
								:placeholder='translate("How to solve the problem?")'>
							</textarea>
							<button class="center-btn">{{ translate("Preview") }}</button>
						</fieldset>
					</form>
				</div>
				<div v-show="modalProb.preview" class="card newproblem-preview">
					<label for="modal-newproblem" class="modal-close"
						@click="modalProb.preview=false">
					</label>
					<my-problem-summary :prob="modalProb" :userid="userId" :preview="true">
					</my-problem-summary>
					<div class="button-group">
						<button @click="modalProb.preview=false">{{ translate("Cancel") }}</button>
						<button @click="sendProblem()">{{ translate("Send") }}</button>
					</div>
				</div>
			</div>
		previewProblem: function() {
			if (!V.IsGoodFen(this.modalProb.fen))
				return alert(translations["Bad FEN description"]);
			if (this.modalProb.instructions.trim().length == 0)
				return alert(translations["Empty instructions"]);
			if (this.modalProb.solution.trim().length == 0)
				return alert(translations["Empty solution"]);
			Vue.set(this.modalProb, "preview", true);
		},
		editProblem: function(prob) {
			this.modalProb = prob;
			Vue.set(this.modalProb, "preview", false);
			document.getElementById("modal-newproblem").checked = true;
		},
		deleteProblem: function(pid) {
			ajax(
				"/problems/" + pid,
				"DELETE",
				response => {
					// Delete problem from the list on client side
					let problems = this.curProblems();
					const pIdx = problems.findIndex(p => p.id == pid);
					problems.splice(pIdx, 1);
				}
			);
		},
		sendProblem: function() {
			// Send it to the server and close modal
			ajax(
				"/problems/" + variant.id,
				(this.modalProb.id > 0 ? "PUT" : "POST"),
				this.modalProb,
				response => {
					document.getElementById("modal-newproblem").checked = false;
					Vue.set(this.modalProb, "preview", false);
					if (this.modalProb.id == 0)
					{
						this.myProblems.unshift({
							added: Date.now(),
							id: response.id,
							uid: user.id,
							fen: this.modalProb.fen,
							instructions: this.modalProb.instructions,
							solution: this.modalProb.solution,
						});
						if (!this.curProb && this.display != "mine")
							this.display = "mine";
					}
					else
						this.modalProb.id = 0;
				}
			);
		},
