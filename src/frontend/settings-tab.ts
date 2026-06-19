import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianSimpleGitPlugin from "../../main";

export interface ObsidianSimpleGitPluginSettingsInterface {
	tasksFolder: string;
	docsFolder: string;
}

export const DEFAULT_SETTINGS: ObsidianSimpleGitPluginSettingsInterface = {
	tasksFolder: 'tasks',
	docsFolder: 'docs'
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

		new Setting(containerEl)
			.setName('Tasks Folder')
			.setDesc('Relative path in the vault')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.tasksFolder)
				.setValue(DEFAULT_SETTINGS.tasksFolder)
				.onChange(async (value) => {
					this.plugin.settings.tasksFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Docs Folder')
			.setDesc('Relative path in the vault')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.docsFolder)
				.setValue(this.plugin.settings.docsFolder)
				.onChange(async (value) => {
					this.plugin.settings.docsFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Path for git-lfs')
			.setDesc('Path for git-lfs')
			.addText(text => text
				.setPlaceholder('/opt/homebrew/bin/')
				.setValue(localStorage.getItem('pathGitLFS') ?? '')
				.onChange(async (value) => {
					localStorage.setItem(
						'pathGitLFS',
						value
					);
				}));
	}
}
