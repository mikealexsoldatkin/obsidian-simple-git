import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianSimpleGitPlugin from "../../main";

export interface BranchTypeOption {
	value: string;
	label: string;
}

export interface ObsidianSimpleGitPluginSettingsInterface {
	branchTypes: BranchTypeOption[];
	showCurrentBranch: boolean;
	showStagingTreeOnCommittingUI: boolean;
}

export const DEFAULT_SETTINGS: ObsidianSimpleGitPluginSettingsInterface = {
	branchTypes: [
		{ value: 'docs', label: 'Documentation' },
	],
	showCurrentBranch: true,
	showStagingTreeOnCommittingUI: true,
}

export default class SettingsTab extends PluginSettingTab {
	plugin: ObsidianSimpleGitPlugin;

	constructor(app: App, plugin: ObsidianSimpleGitPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl).setName('Features').setHeading();

		new Setting(containerEl)
			.setName('Show current branch')
			.setDesc('Display the current branch name in the status bar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCurrentBranch)
				.onChange(async (value) => {
					this.plugin.settings.showCurrentBranch = value;
					await this.plugin.saveSettings();
					this.plugin.updateBranchStatusBar();
				}));

		new Setting(containerEl)
			.setName('Show staging file tree')
			.setDesc('Show the tree of changed files in the commit window when auto staging is off')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStagingTreeOnCommittingUI)
				.onChange(async (value) => {
					this.plugin.settings.showStagingTreeOnCommittingUI = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Branch types').setHeading();

		this.plugin.settings.branchTypes.forEach((branchType, index) => {
			new Setting(containerEl)
				.addText(text => text
					.setPlaceholder('docs')
					.setValue(branchType.value)
					.onChange(async (value) => {
						this.plugin.settings.branchTypes[index].value = value;
						await this.plugin.saveSettings();
					}))
				.addText(text => text
					.setPlaceholder('Documentation')
					.setValue(branchType.label)
					.onChange(async (value) => {
						this.plugin.settings.branchTypes[index].label = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setIcon('trash')
					.setTooltip('Remove branch type')
					.onClick(async () => {
						this.plugin.settings.branchTypes.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		});

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add branch type')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.branchTypes.push({ value: '', label: '' });
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl).setName('Environment').setHeading();

		new Setting(containerEl)
			.setName('Path')
			.setDesc('Additional PATH (optional)')
			.addText(text => text
				.setPlaceholder('/opt/homebrew/bin/')
				.setValue(this.app.loadLocalStorage('additionalPath') ?? '')
				.onChange(async (value) => {
					this.app.saveLocalStorage(
						'additionalPath',
						value
					);
				}));
	}
}
