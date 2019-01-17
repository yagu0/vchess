Vue.component('my-problems', {
	props: ["probId","settings"],
	data: function () {
		return {
			userId: user.id,
			problems: [], //oldest first
			myProblems: [], //same, but only mine
			singletons: [], //requested problems (using #num)
			display: "others", //or "mine"
			curProb: null, //(reference to) current displayed problem (if any)
			showSolution: false,
			nomoreMessage: "",
			mode: "analyze", //for game component
			pbNum: 0, //to navigate directly to some problem
			// New problem (to upload), or existing problem to edit:
			modalProb: {
				id: 0, //defined if it's an edit
				uid: 0, //...also
				fen: "",
				instructions: "",
				solution: "",
				preview: false,
			},
		};
	},
	template: `
		<div class="col-sm-12 col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2">
			<div id="problemControls" class="button-group">
				<button :aria-label='translate("Previous problem(s)")' class="tooltip"
					@click="showNext('backward')"
				>
					<i class="material-icons">skip_previous</i>
				</button>
				<button v-if="!!userId" :aria-label='translate("Add a problem")'
					class="tooltip" onClick="doClick('modal-newproblem')"
				>
					{{ translate("New") }}
				</button>
				<button :aria-label='translate("Next problem(s)")' class="tooltip"
					@click="showNext('forward')"
				>
					<i class="material-icons">skip_next</i>
				</button>
			</div>
			<div id="mainBoard" v-if="!!curProb">
				<div id="instructions-div" class="section-content">
					<p id="problem-instructions">{{ curProb.instructions }}</p>
				</div>
				<my-game :fen="curProb.fen" :mode="mode" :allowMovelist="true"
					:settings="settings">
				</my-game>
				<div id="solution-div" class="section-content">
					<h3 class="clickable" @click="showSolution = !showSolution">
						{{ translate("Show solution") }}
					</h3>
					<p id="problem-solution" v-show="showSolution">{{ curProb.solution }}</p>
				</div>
				<button @click="displayList">Back to list display</button>
			</div>
			<div>
				<input type="text" placeholder="Type problem number" v-model="pbNum"/>
				<button @click="showProblem">Show problem</button>
			</div>
			<button v-if="!!userId" @click="toggleListDisplay"
				:class="{'only-mine':display=='mine'}"
			>
				My problems (only)
			</button>
			<my-problem-summary v-show="!curProb"
				v-on:edit-problem="editProblem(p)" v-on:delete-problem="deleteProblem(p.id)"
				v-on:show-problem="() => showProblem(p.id)"
				v-for="p in curProblems()" @click="curProb=p"
				v-bind:prob="p" v-bind:userid="userId" v-bind:key="p.id">
			</my-problem-summary>
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
			<input id="modalNomore" type="checkbox" class="modal"/>
			<div role="dialog" aria-labelledby="nomoreMessage">
				<div class="card smallpad small-modal text-center">
					<label for="modalNomore" class="modal-close"></label>
					<h3 id="nomoreMessage" class="section">{{ nomoreMessage }}</h3>
				</div>
			</div>
		</div>
	`,
	watch: {
		probId: function() {
			this.showProblem(this.probId);
		},
	},
	created: function() {
		if (!!this.probId)
			this.showProblem(this.probId);
		else
			this.firstFetch();
	},
	methods: {
		translate: translate,
		firstFetch: function() {
			// Fetch most recent problems from server, for both lists
			this.fetchProblems("others", "bacwkard");
			this.fetchProblems("mine", "bacwkard");
			this.listsInitialized = true;
		},
		showProblem: function(num) {
			const pid = num || this.pbNum;
			location.hash = "#problems?id=" + pid;
			for (let parray of [this.singletons,this.problems,this.myProblems])
			{
				const pIdx = parray.findIndex(p => p.id == pid);
				if (pIdx >= 0)
				{
					this.curProb = parray[pIdx];
					break;
				}
			}
			if (!this.curProb)
			{
				// Cannot find problem in current set; get from server, and add to singletons.
				ajax(
					"/problems/" + variant.id + "/" + pid, //TODO: variant ID should not be required
					"GET",
					response => {
						if (!!response.problem)
						{
							this.singletons.push(response.problem);
							this.curProb = response.problem;
						}
						else
							this.noMoreProblems("Sorry, problem " + pid + " does not exist");
					}
				);
			}
		},
		curProblems: function() {
			switch (this.display)
			{
				case "others":
					return this.problems;
				case "mine":
					return this.myProblems;
			}
		},
		// TODO?: get 50 from server but only show 10 at a time (for example)
		showNext: function(direction) {
			if (!this.curProb)
				return this.fetchProblems(this.display, direction);
			// Show next problem (older or newer):
			let curProbs = this.curProblems();
			// Try to find a neighbour problem in the direction, among current set
			const neighbor = this.findClosestNeighbor(this.curProb, curProbs, direction);
			if (!!neighbor)
			{
				this.curProb = neighbor;
				return;
			}
			// Boundary case: nothing in current set, need to fetch from server
			const curSize = curProbs.length;
			this.fetchProblems(this.display, direction);
			const newSize = curProbs.length;
			if (curSize == newSize) //no problems found
				return this.noMoreProblems("No more problems in this direction");
			// Ok, found something:
			this.curProb = this.findClosestNeighbor(this.curProb, curProbs, direction);
		},
		findClosestNeighbor: function(problem, probList, direction) {
			let neighbor = undefined;
			let smallestDistance = Number.MAX_SAFE_INTEGER;
			for (let prob of probList)
			{
				const delta = Math.abs(prob.id - problem.id);
				if (delta < smallestDistance &&
					((direction == "backward" && prob.id < problem.id)
					|| (direction == "forward" && prob.id > problem.id)))
				{
					neighbor = prob;
					smallestDistance = delta;
				}
			}
			return neighbor;
		},
		noMoreProblems: function(message) {
			this.nomoreMessage = message;
			let modalNomore = document.getElementById("modalNomore");
			modalNomore.checked = true;
			setTimeout(() => modalNomore.checked = false, 2000);
		},
		displayList: function() {
			this.curProb = null;
			location.hash = "#problems";
			// Fetch problems if first call (if #num, and then lists)
			if (!this.listsInitialized)
				this.firstFetch();
		},
		toggleListDisplay: function() {
			const displays = ["mine","others"];
			const curIndex = displays.findIndex(item => item == this.display);
			this.display = displays[1-curIndex];
		},
		fetchProblems: function(type, direction) {
			let problems = (type == "others" ? this.problems : this.myProblems);
			// "last datetime" set at a value OK for an empty initial array
			let last_dt = (direction=="forward" ? 0 : Number.MAX_SAFE_INTEGER);
			if (problems.length > 0)
			{
				// Search for newest date (or oldest)
				last_dt = problems[0].added;
				for (let i=1; i<problems.length; i++)
				{
					if ((direction == "forward" && problems[i].added > last_dt) ||
						(direction == "backward" && problems[i].added < last_dt))
					{
						last_dt = problems[i].added;
					}
				}
			}
			ajax(
				"/problems/" + variant.id,
				"GET",
				{
					type: type,
					direction: direction,
					last_dt: last_dt,
				},
				response => {
					if (response.problems.length > 0)
					{
						Array.prototype.push.apply(problems,
							response.problems.sort((p1,p2) => { return p2.added - p1.added; }));
						// If one list is empty but not the other, show the non-empty
						const otherArray = (type == "mine" ? this.problems : this.myProblems);
						if (problems.length > 0 && otherArray.length == 0)
							this.display = type;
					}
				}
			);
		},
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
					}
					else
						this.modalProb.id = 0;
				}
			);
		},
	},
})
