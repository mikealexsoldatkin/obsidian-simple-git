import {App, Modal, Notice, Setting} from 'obsidian';
import Backend from '../backend';
import {ValidationModalInterface} from './validation-modal-interface';

export interface CommittingSettingsInterface {
	commitMessage: string;
	autoStaging: boolean;
	selectedFiles: string[];
	files: string[];
}

interface FileTreeNode {
	name: string;
	path: string;
	isFile: boolean;
	children: Map<string, FileTreeNode>;
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
	fileCheckboxes: { path: string; el: HTMLInputElement }[] = [];
	folderCheckboxes: { descendants: string[]; el: HTMLInputElement }[] = [];

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
		contentEl.createEl("h1", { text: this.title });

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
		this.backend.gitWrapper.getStatus().then((files) => {
			this.allFiles = files.map(file => file.path);
			this.checkedFiles = new Set(files.filter(file => file.staged).map(file => file.path));
			this.renderFileTree(files);
			this.updateTreeVisibility();
		});
	}

	private renderFileTree(files: { path: string; staged: boolean }[]) {
		this.treeContainer.empty();
		this.fileCheckboxes = [];
		this.folderCheckboxes = [];

		this.treeContainer.createEl("h6", { text: "Files to commit" });

		if (!files.length) {
			this.treeContainer.createDiv({ text: "No changes detected", cls: "git-tree-empty" });
			return;
		}

		const treeEl = this.treeContainer.createDiv({ cls: "git-file-tree" });
		const root = this.buildTree(files);
		this.renderNode(root, treeEl, 0);
		this.refreshFolderStates();
	}

	private buildTree(files: { path: string }[]): FileTreeNode {
		const root: FileTreeNode = { name: "", path: "", isFile: false, children: new Map() };
		for (const file of files) {
			const parts = file.path.split("/");
			let node = root;
			parts.forEach((part, index) => {
				const isFile = index === parts.length - 1;
				if (!node.children.has(part)) {
					node.children.set(part, {
						name: part,
						path: parts.slice(0, index + 1).join("/"),
						isFile,
						children: new Map()
					});
				}
				node = node.children.get(part) as FileTreeNode;
			});
		}
		return root;
	}

	private renderNode(node: FileTreeNode, container: HTMLElement, depth: number) {
		const children = Array.from(node.children.values()).sort((a, b) => {
			if (a.isFile !== b.isFile) {
				return a.isFile ? 1 : -1;
			}
			return a.name.localeCompare(b.name);
		});

		for (const child of children) {
			const row = container.createDiv({ cls: "git-tree-row" });
			row.style.paddingLeft = `${depth * 18}px`;
			const checkbox = row.createEl("input", { type: "checkbox" });
			row.createSpan({ text: child.isFile ? child.name : `${child.name}/` });

			if (child.isFile) {
				checkbox.checked = this.checkedFiles.has(child.path);
				this.fileCheckboxes.push({ path: child.path, el: checkbox });
				checkbox.addEventListener("change", () => {
					if (checkbox.checked) {
						this.checkedFiles.add(child.path);
					} else {
						this.checkedFiles.delete(child.path);
					}
					this.refreshFolderStates();
				});
			} else {
				const descendants = this.collectFileDescendants(child);
				this.folderCheckboxes.push({ descendants, el: checkbox });
				checkbox.addEventListener("change", () => {
					for (const path of descendants) {
						if (checkbox.checked) {
							this.checkedFiles.add(path);
						} else {
							this.checkedFiles.delete(path);
						}
					}
					for (const fileCheckbox of this.fileCheckboxes) {
						if (descendants.includes(fileCheckbox.path)) {
							fileCheckbox.el.checked = checkbox.checked;
						}
					}
					this.refreshFolderStates();
				});
				this.renderNode(child, container, depth + 1);
			}
		}
	}

	private collectFileDescendants(node: FileTreeNode): string[] {
		const result: string[] = [];
		for (const child of node.children.values()) {
			if (child.isFile) {
				result.push(child.path);
			} else {
				result.push(...this.collectFileDescendants(child));
			}
		}
		return result;
	}

	private refreshFolderStates() {
		for (const folder of this.folderCheckboxes) {
			const checkedCount = folder.descendants.filter(path => this.checkedFiles.has(path)).length;
			folder.el.checked = folder.descendants.length > 0 && checkedCount === folder.descendants.length;
			folder.el.indeterminate = checkedCount > 0 && checkedCount < folder.descendants.length;
		}
	}

	private updateTreeVisibility() {
		if (!this.treeContainer) {
			return;
		}
		this.treeContainer.style.display = this.values.autoStaging ? "none" : "";
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
