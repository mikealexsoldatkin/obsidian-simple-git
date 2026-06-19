import {Plugin} from 'obsidian';
import CreatingBranchModal from './src/frontend/creating-branch-modal';
import CommittingSettingsModal from './src/frontend/committing-modal';
import SettingsTab from './src/frontend/settings-tab';
import {ObsidianSimpleGitPluginSettingsInterface, DEFAULT_SETTINGS} from './src/frontend/settings-tab';
import Backend from './src/backend';

export default class ObsidianSimpleGitPlugin extends Plugin {
	settings: ObsidianSimpleGitPluginSettingsInterface;
	backend: Backend;

	async onload() {
		await this.loadSettings();
		this.backend = Backend.getInstance(this);

		this.addSettingTab(new SettingsTab(this.app, this));

		const gitLeftStatusBarItem = this.addStatusBarItem();
		gitLeftStatusBarItem.setText('Git actions:');

		const updateFromBitbucketStatusBarItem = this.addStatusBarItem();
		updateFromBitbucketStatusBarItem.setText('↙');
		updateFromBitbucketStatusBarItem.setAttribute("title", "Pull updates from the remote repository");
		updateFromBitbucketStatusBarItem.classList.add("status-bar-button");
		updateFromBitbucketStatusBarItem.addEventListener("click", () => {
			this.backend.gitWrapper.pull().then(() => this.sendGitRefreshEvent());
		});

		const createNewBranchStatusBarItem = this.addStatusBarItem();
		createNewBranchStatusBarItem.setText('⎇');
		createNewBranchStatusBarItem.setAttribute("title", "Create a new branch");
		createNewBranchStatusBarItem.classList.add("status-bar-button");
		createNewBranchStatusBarItem.addEventListener("click", () => {
			new CreatingBranchModal(this.app, (result) => {
				this.backend.gitWrapper.pullAndCreateBranch(
					this.backend.getNewBranchName(result.branchType, result.taskCode)
				).then(() => this.sendGitRefreshEvent());
			}).open();
		});

		const commitChangesStatusBarItem = this.addStatusBarItem();
		commitChangesStatusBarItem.setText('⛁');
		commitChangesStatusBarItem.setAttribute("title", "Commit all the files changes");
		commitChangesStatusBarItem.classList.add("status-bar-button");
		commitChangesStatusBarItem.addEventListener("click", () => {
			new CommittingSettingsModal(this.app, 'Committing changes', "Commit", (result) => {
				this.backend.saveCommitMessage(result.commitMessage);
				const staging = result.autoStaging ? this.backend.gitWrapper.stageAll() : Promise.resolve();
				staging
					.then(() => this.backend.gitWrapper.commit(result.commitMessage))
					.then(() => this.sendGitRefreshEvent());
			}).open();
		});

		const uploadToBitbucketStatusBarItem = this.addStatusBarItem();
		uploadToBitbucketStatusBarItem.setText('↗');
		uploadToBitbucketStatusBarItem.setAttribute("title", "Push changes to the remote repository");
		uploadToBitbucketStatusBarItem.classList.add("status-bar-button");
		uploadToBitbucketStatusBarItem.addEventListener("click", () => {
			new CommittingSettingsModal(this.app, 'Pushing changes', "Push", (result) => {
				this.backend.saveCommitMessage(result.commitMessage);
				const staging = result.autoStaging ? this.backend.gitWrapper.stageAll() : Promise.resolve();
				staging
					.then(() => this.backend.gitWrapper.commit(result.commitMessage))
					.then(() => this.backend.gitWrapper.push())
					.then(() => this.sendGitRefreshEvent());
			}).open();
		});

		const gitRightStatusBarItem = this.addStatusBarItem();
		gitRightStatusBarItem.setText('   ');
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async sendGitRefreshEvent() {
		const GIT_REFRESH_EVENT_NAME =  "obsidian-git:refresh";
		this.app.workspace.trigger(GIT_REFRESH_EVENT_NAME);
	}
}
