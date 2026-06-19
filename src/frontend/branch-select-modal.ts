import { App, FuzzySuggestModal } from 'obsidian';

export default class BranchSelectModal extends FuzzySuggestModal<string> {
	branches: string[];
	onChoose: (branch: string) => void;

	constructor(app: App, branches: string[], onChoose: (branch: string) => void) {
		super(app);
		this.branches = branches;
		this.onChoose = onChoose;
		this.setPlaceholder('Search for a branch...');
	}

	getItems(): string[] {
		return this.branches;
	}

	getItemText(branch: string): string {
		return branch;
	}

	onChooseItem(branch: string): void {
		this.onChoose(branch);
	}
}
