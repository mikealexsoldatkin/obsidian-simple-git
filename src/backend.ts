import { FileSystemAdapter, Notice } from 'obsidian';
import ObsidianSimpleGitPlugin from '../main';
import GitWrapper from './git-wrapper';

export default class Backend {
	static _backendSingleton: Backend;
	plugin: ObsidianSimpleGitPlugin;
	basePath: string;
	gitWrapper: GitWrapper;
	tasksFolder: string;
	docsFolder: string;

	public static getInstance(plugin?: ObsidianSimpleGitPlugin) {
		if (!this._backendSingleton) {
			if (!plugin) {
				throw new Error('Backend has not been initialized yet. Need to provide the Plugin info');
			} else {
				this._backendSingleton = new Backend(plugin);
			}
		}

		return this._backendSingleton;
	}

	constructor(plugin: ObsidianSimpleGitPlugin) {
		this.plugin = plugin;
		if (plugin.app.vault.adapter instanceof FileSystemAdapter) {
			this.basePath = plugin.app.vault.adapter.getBasePath();
		} else {
			const message = 'Error: You do not have access to the file system';
			console.log(message);
			new Notice(message);
			throw new Error(message);
		}
		this.tasksFolder = plugin.settings.tasksFolder;
		this.docsFolder = plugin.settings.docsFolder;
		this.gitWrapper = new GitWrapper(this.basePath);
		return this;
	}

	public loadCommitMessage() {
		const message = localStorage.getItem(this.gitWrapper.getBranchNameSync());
		return message ?
			message :
			`${this.gitWrapper.getBranchType()}(${this.getTaskNumber()}): `
	}

	public getNewBranchName(branchType: string, taskCode: string) {
		return `${branchType}/${taskCode}`;
	}

	public saveCommitMessage(message: string) {
		localStorage.setItem(
			this.gitWrapper.getBranchNameSync(),
			message
		);
	}

	public loadAutoStaging() {
		const value = localStorage.getItem('autoStaging');
		return value === null ? true : value === 'true';
	}

	public saveAutoStaging(autoStaging: boolean) {
		localStorage.setItem('autoStaging', String(autoStaging));
	}

	public getTaskNumber() {
		const split = (this.gitWrapper.getBranchNameSync()).split('/');
		return split[split.length - 1].trim();
	}
}
