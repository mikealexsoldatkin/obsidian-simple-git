import {App, Modal, Notice, Setting} from 'obsidian';
import Backend from '../backend';
import {ValidationModalInterface} from './validation-modal-interface';

export interface CreatingBranchSettingsInterface {
	taskCode: string;
	branchType: BranchType;
}

export enum BranchType {
	docs = 'docs',
	catch = 'catch'
}

export default class CreatingBranchModal extends Modal {
	values: CreatingBranchSettingsInterface;
	onSubmit: (result: CreatingBranchSettingsInterface) => void;
	backend: Backend;
	validationResult: ValidationModalInterface

	constructor(app: App, onSubmit: (result: CreatingBranchSettingsInterface) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.values = {
			taskCode: '',
			branchType: BranchType.docs
		};
		this.backend = Backend.getInstance();
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Creating a new branch" });

		contentEl.createEl("h6", { text: "WARN: Inheritance from the current branch: " + this.backend.gitWrapper.getBranchNameSync()});

		new Setting(contentEl)
			.setName("Jira task code")
			.addText((text) =>
				text
					.setPlaceholder('CRM-XXXX')
					.onChange((value) => {
						this.values.taskCode = value;
					})
					.inputEl.addClass("task-code-input")
			);

		new Setting(contentEl)
			.setName("Branch Type")
			.addDropdown((dropdown) => {
				dropdown
					.addOption(BranchType.docs, "[Docs] - Новая функциональность")
					.addOption(BranchType.catch, "[Catch] - Тех. долг")
					.onChange((value: BranchType) => {
						this.values.branchType = value; // Сохраняем выбранное значение
					});
				dropdown.selectEl.addClass("task-type-dropdown");
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Create")
					.setCta()
					.onClick(() => {
						if (this.validate().isValid) {
							this.close();
							this.onSubmit(this.values);
						} else {
							new Notice(this.validationResult.validationErrorText);
						}
					}));
	}

	validate() {
		const errors = [];

		if (!this.values.taskCode) {
			errors.push("Field 'Jira Task Code' is required");
		}

		if (!this.values.branchType) {
			errors.push("Field 'Branch Type' is required");
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
