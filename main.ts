import {Plugin} from 'obsidian';
import CreatingBranchModal from './src/frontend/creating-branch-modal';
import CommittingSettingsModal, {CommittingSettingsInterface} from './src/frontend/committing-modal';
import SettingsTab from './src/frontend/settings-tab';
import {ObsidianSimpleGitPluginSettingsInterface, DEFAULT_SETTINGS} from './src/frontend/settings-tab';
import Backend from './src/backend';
import BranchSelectModal from './src/frontend/branch-select-modal';

export default class ObsidianSimpleGitPlugin extends Plugin {
	settings: ObsidianSimpleGitPluginSettingsInterface;
	backend: Backend;
	branchStatusBarItem: HTMLElement;

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
			void this.backend.gitWrapper.pull().then(() => this.sendGitRefreshEvent());
		});

		const createNewBranchStatusBarItem = this.addStatusBarItem();
		createNewBranchStatusBarItem.setText('⎇');
		createNewBranchStatusBarItem.setAttribute("title", "Create a new branch");
		createNewBranchStatusBarItem.classList.add("status-bar-button");
		createNewBranchStatusBarItem.addEventListener("click", () => {
			new CreatingBranchModal(this.app, (result) => {
				void this.backend.gitWrapper.pullAndCreateBranch(
					this.backend.getNewBranchName(result.branchType, result.taskCode)
				).then(() => {
					this.updateBranchStatusBar();
					this.sendGitRefreshEvent();
				});
			}).open();
		});

		const commitChangesStatusBarItem = this.addStatusBarItem();
		commitChangesStatusBarItem.setText('⛁');
		commitChangesStatusBarItem.setAttribute("title", "Commit all the files changes");
		commitChangesStatusBarItem.classList.add("status-bar-button");
		commitChangesStatusBarItem.addEventListener("click", () => {
			new CommittingSettingsModal(this.app, 'Committing changes', "Commit", (result) => {
				this.backend.saveCommitMessage(result.commitMessage);
				const staging = this.stageForCommit(result);
				void staging
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
				const staging = this.stageForCommit(result);
				void staging
					.then(() => this.backend.gitWrapper.commit(result.commitMessage))
					.then(() => this.backend.gitWrapper.push())
					.then(() => this.sendGitRefreshEvent());
			}).open();
		});

		this.branchStatusBarItem = this.addStatusBarItem();
		this.branchStatusBarItem.setAttribute("title", "Switch branch");
		this.branchStatusBarItem.classList.add("status-bar-button");
		this.branchStatusBarItem.addEventListener("click", () => {
			void this.backend.gitWrapper.getBranches().then((branches) => {
				new BranchSelectModal(this.app, branches, (branch) => {
					void this.backend.gitWrapper.checkout(branch).then(() => {
						this.updateBranchStatusBar();
						this.sendGitRefreshEvent();
					});
				}).open();
			});
		});
		this.updateBranchStatusBar();

		const gitRightStatusBarItem = this.addStatusBarItem();
		gitRightStatusBarItem.setText('   ');
	}

	stageForCommit(result: CommittingSettingsInterface): Promise<void> {
		if (result.autoStaging) {
			return this.backend.gitWrapper.stageAll();
		}
		const toUnstage = result.files.filter(file => !result.selectedFiles.includes(file));
		return this.backend.gitWrapper.setStaged(result.selectedFiles, toUnstage);
	}

	updateBranchStatusBar() {
		this.branchStatusBarItem.toggle(this.settings.showCurrentBranch);
		if (!this.settings.showCurrentBranch) {
			return;
		}
		const branch = this.backend.gitWrapper.getBranchNameSync();
		this.branchStatusBarItem.setText(branch || '(no branch)');
	}

	onunload() {
	}

	async loadSettings() {
		const data = await this.loadData() as Partial<ObsidianSimpleGitPluginSettingsInterface> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	sendGitRefreshEvent() {
		const GIT_REFRESH_EVENT_NAME =  "obsidian-git:refresh";
		this.app.workspace.trigger(GIT_REFRESH_EVENT_NAME);
	}
}
