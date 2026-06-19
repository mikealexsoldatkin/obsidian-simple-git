import {App, Modal, Notice, Setting} from 'obsidian';
import Backend from '../backend';
import {ValidationModalInterface} from './validation-modal-interface';

export interface CommittingSettingsInterface {
	commitMessage: string;
	autoStaging: boolean;
}

export default class CommittingSettingsModal extends Modal {
	title: string;
	submitButtonName: string;
	values: CommittingSettingsInterface;
	onSubmit: (result: CommittingSettingsInterface) => void;
	backend: Backend;
	validationResult: ValidationModalInterface

	constructor(app: App, title: string, submitButtonName: string, onSubmit: (result: CommittingSettingsInterface) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.backend = Backend.getInstance();
		this.title = title;
		this.submitButtonName = submitButtonName;
		this.values = {
			commitMessage: this.backend.loadCommitMessage(),
			autoStaging: this.backend.loadAutoStaging()
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: this.title });

		new Setting(contentEl)
			.setName("Changes")
			.addTextArea((textarea) =>
				textarea
					.setPlaceholder(this.values.commitMessage)
					.setValue(this.values.commitMessage)
					.onChange((value) => {
						this.values.commitMessage = value;
					})
					.inputEl.addClass("commit-description-input")
			);

		new Setting(contentEl)
			.setName("Auto staging")
			.setDesc("Stage all files before committing")
			.addToggle((toggle) =>
				toggle
					.setValue(this.values.autoStaging)
					.setDisabled(true)
					.onChange((value) => {
						this.values.autoStaging = value;
						this.backend.saveAutoStaging(value);
					})
			);

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText(this.submitButtonName)
					.setCta()
					.onClick(() => {
						this.validate();
						if (this.validate().isValid) {
							this.close();
							this.onSubmit(this.values);
						} else {
							new Notice(this.validationResult.validationErrorText);
						}
					})
			);
	}

	validate() {
		const errors = [];

		if (!this.values.commitMessage) {
			errors.push("Field 'Changes' is required");
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
