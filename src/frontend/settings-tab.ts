import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianSimpleGitPlugin from "../../main";

export interface ObsidianSimpleGitPluginSettingsInterface {

}

export const DEFAULT_SETTINGS: ObsidianSimpleGitPluginSettingsInterface = {

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
			.setName('Path')
			.setDesc('Additional PATH (optional)')
			.addText(text => text
				.setPlaceholder('/opt/homebrew/bin/')
				.setValue(localStorage.getItem('additionalPath') ?? '')
				.onChange(async (value) => {
					localStorage.setItem(
						'additionalPath',
						value
					);
				}));
	}
}
