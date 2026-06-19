import {App, Modal, Notice, Setting} from 'obsidian';
import Backend from '../backend';
import {ValidationModalInterface} from './validation-modal-interface';

export interface CommittingSettingsInterface {
	commitMessage: string;
	autoStaging: boolean;
	selectedFiles: string[];
	files: string[];
}

export default class CommittingSettingsModal extends Modal {
	title: string;
	submitButtonName: string;
	values: CommittingSettingsInterface;
	onSubmit: (result: CommittingSettingsInterface) => void;
	backend: Backend;
	validationResult: ValidationModalInterface;

	treeContainer: HTMLElement;
	allFiles: string[] = [];
	checkedFiles: Set<string> = new Set();

	constructor(app: App, title: string, submitButtonName: string, onSubmit: (result: CommittingSettingsInterface) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.backend = Backend.getInstance();
		this.title = title;
		this.submitButtonName = submitButtonName;
		this.values = {
			commitMessage: this.backend.loadCommitMessage(),
			autoStaging: this.backend.loadAutoStaging(),
			selectedFiles: [],
			files: []
		};
	}

	onOpen() {
		const { contentEl } = this;
		this.modalEl.addClass("git-commit-modal");
		contentEl.createEl("h1", { text: this.title });


		new Setting(contentEl)
			.setName("Commit Message")
			.addTextArea((textarea) =>
				textarea
					.setPlaceholder(this.values.commitMessage)
					.setValue(this.values.commitMessage)
					.onChange((value) => {
						this.values.commitMessage = value;
					})
					.inputEl.addClass("commit-description-input")
			);


		contentEl.createEl("h6", { text: "" });

		new Setting(contentEl)
			.setName("Auto staging")
			.setDesc("Stage all files before committing")
			.addToggle((toggle) =>
				toggle
					.setValue(this.values.autoStaging)
					.onChange((value) => {
						this.values.autoStaging = value;
						this.backend.saveAutoStaging(value);
						this.updateTreeVisibility();
					})
			);

		this.treeContainer = contentEl.createDiv();
		this.loadFileTree();

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText(this.submitButtonName)
					.setCta()
					.onClick(() => {
						if (this.validate().isValid) {
							this.values.files = this.allFiles;
							this.values.selectedFiles = Array.from(this.checkedFiles);
							this.close();
							this.onSubmit(this.values);
						} else {
							new Notice(this.validationResult.validationErrorText);
						}
					})
			);
	}

	private loadFileTree() {
		if (!this.backend.plugin.settings.showStagingTreeOnCommittingUI) {
			this.updateTreeVisibility();
			return;
		}
		void this.backend.gitWrapper.getStatus().then((files) => {
			this.allFiles = files.map(file => file.path);
			this.checkedFiles = new Set(files.filter(file => file.staged).map(file => file.path));
			this.renderFileTree(files);
			this.updateTreeVisibility();
		});
	}

	private renderFileTree(files: { path: string; staged: boolean; status: string }[]) {
		this.treeContainer.empty();

		this.treeContainer.createEl("h6", { text: "Files to commit" });

		if (!files.length) {
			this.treeContainer.createDiv({ text: "No changes detected", cls: "git-tree-empty" });
			return;
		}

		const treeEl = this.treeContainer.createDiv({ cls: "git-file-tree" });
		const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

		for (const file of sorted) {
			const row = treeEl.createDiv({ cls: "git-tree-row" });
			const checkbox = row.createEl("input", { type: "checkbox" });
			checkbox.checked = this.checkedFiles.has(file.path);
			row.createSpan({ text: `[${file.status}] `, cls: `git-file-status git-file-status-${file.status}` });
			row.createSpan({ text: ` `});
			row.createSpan({ text: file.path, cls: "git-file-path" });

			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.checkedFiles.add(file.path);
				} else {
					this.checkedFiles.delete(file.path);
				}
			});
		}
	}

	private updateTreeVisibility() {
		if (!this.treeContainer) {
			return;
		}
		const show = this.backend.plugin.settings.showStagingTreeOnCommittingUI && !this.values.autoStaging;
		this.treeContainer.style.display = show ? "" : "none";
	}

	validate() {
		const errors = [];

		if (!this.values.commitMessage) {
			errors.push("Field 'Commit Message' is required");
		}

		this.validationResult = {
			isValid: !errors.length,
			validationErrorText: errors.join('; ')
		}

		return this.validationResult;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
