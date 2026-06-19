import {App, Modal, Notice, Setting} from 'obsidian';
import Backend from '../backend';
import {ValidationModalInterface} from './validation-modal-interface';

export interface CreatingBranchSettingsInterface {
	taskCode: string;
	branchType: string;
}

export default class CreatingBranchModal extends Modal {
	values: CreatingBranchSettingsInterface;
	onSubmit: (result: CreatingBranchSettingsInterface) => void;
	backend: Backend;
	validationResult: ValidationModalInterface

	constructor(app: App, onSubmit: (result: CreatingBranchSettingsInterface) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.backend = Backend.getInstance();
		this.values = {
			taskCode: '',
			branchType: this.backend.plugin.settings.branchTypes[0]?.value ?? ''
		};
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Creating a new branch" });

		contentEl.createEl("h6", { text: "Inheritance from the current branch: " + this.backend.gitWrapper.getBranchNameSync()});

		new Setting(contentEl)
			.setName("Issue key")
			.addText((text) =>
				text
					.setPlaceholder('KEY-1234')
					.onChange((value) => {
						this.values.taskCode = value;
					})
					.inputEl.addClass("task-code-input")
			);

		new Setting(contentEl)
			.setName("Branch Type")
			.addDropdown((dropdown) => {
				this.backend.plugin.settings.branchTypes.forEach((branchType) => {
					dropdown.addOption(branchType.value, `[${branchType.value}]: ${branchType.label}`);
				});
				dropdown
					.setValue(this.values.branchType)
					.onChange((value) => {
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
			errors.push("Field 'Issue key' is required");
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
