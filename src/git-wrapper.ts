import {Notice, Platform} from 'obsidian';
import simpleGit from 'simple-git';
import {SimpleGit} from 'simple-git/dist/typings/simple-git';
import {execSync} from 'child_process';
import {existsSync} from 'fs';

export default class GitWrapper {
	basePath: string;
	git: SimpleGit;
	env: NodeJS.ProcessEnv;

	constructor(basePath: string) {
		this.basePath = basePath;
		this.env = this.buildEnv();
		this.git = simpleGit({ baseDir: basePath });
		this.git.env(this.env);
		this.git.addConfig('core.quotepath', 'false');
		this.git.addConfig('pull.rebase', 'false');
		this.configureLfs();
	}

	private configureLfs(): void {
		const whichCmd = Platform.isWin ? 'where git-lfs' : 'which git-lfs';
		const out = this.shellExecSync(whichCmd).trim();

		const lfsBin = (out.split(/\r?\n/)[0] ?? '').trim().replace(/\/{2,}/g, '/');

		if (!lfsBin || !existsSync(lfsBin)) {
			return;
		}

		const q = `"${lfsBin.replace(/\\/g, '/')}"`;
		this.git.addConfig('filter.lfs.process',  `${q} filter-process`);
		this.git.addConfig('filter.lfs.clean',    `${q} clean -- %f`);
		this.git.addConfig('filter.lfs.smudge',   `${q} smudge -- %f`);
		this.git.addConfig('filter.lfs.required', 'true');
	}

	private buildEnv(): NodeJS.ProcessEnv {
		const sep = Platform.isWin ? ';' : ':';
		const parts = [process.env.PATH ?? ''];

		const shellPath = this.detectShellPath();
		if (shellPath) parts.push(shellPath);

		let lfsPath = localStorage.getItem('additionalPath')?.trim();
		if (lfsPath) {
			lfsPath = lfsPath.replace(/[/\\]git-lfs(\.exe)?$/i, '');
			parts.push(lfsPath);
		}

		const seen = new Set<string>();
		const PATH = parts.join(sep).split(sep)
			.filter(p => p && !seen.has(p) && seen.add(p))
			.join(sep);

		return { ...process.env, PATH };
	}

	private detectShellPath(): string | null {
		if (Platform.isWin) return null;
		try {
			const shell = process.env.SHELL || '/bin/bash';
			const m = '__OBS_PATH__';
			const out = execSync(`${shell} -ilc 'echo -n ${m}$PATH${m}'`, {
				encoding: 'utf8',
				timeout: 5000,
			});
			const match = out.match(new RegExp(`${m}(.*?)${m}`));
			return match ? match[1] : null;
		} catch {
			return null;
		}
	}

	public async stageAll(): Promise<void> {
		try {
			new Notice('Staging all changes');
			await this.git.add('.');
		} catch (error) {
			new Notice('Error while staging: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public async push(): Promise<void> {
		try {
			new Notice('Pushing');
			let message = this.shellExecSync(
				'git push',
				localStorage.getItem('additionalPath') ?? undefined
			).trim();

			if (message.length<1) {
				message = 'Pushed successfully';
			}

			new Notice(message);
			console.log(message);
		} catch (error) {
			new Notice('Error while pushing: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public async commit(commitMessage: string): Promise<void> {
		try {
			new Notice('Committing');
			const result = await this.git.commit(commitMessage);
			let message;

			if (!!result && !!result.summary) {
				message = `Commit completed.\n${result.summary.changes} files updated`;
			} else {
				message ='Commit completed';
			}

			new Notice(message);
			console.log(message);
		} catch (error) {
			new Notice('Error while committing: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public async getStatus(): Promise<{ path: string; staged: boolean; status: string }[]> {
		try {
			const result = await this.git.status();
			return result.files.map(file => {
				const code = (file.index !== ' ' && file.index !== '?') ? file.index : file.working_dir;
				let status: string;
				if (code === 'D') {
					status = 'D';
				} else if (code === 'A' || code === '?') {
					status = 'A';
				} else {
					status = 'M';
				}
				return {
					path: file.path,
					staged: file.index !== ' ' && file.index !== '?',
					status
				};
			});
		} catch (error) {
			new Notice('Error while reading status: ' + error.message.substring(0, 300));
			console.error(error);
			return [];
		}
	}

	public async setStaged(toStage: string[], toUnstage: string[]): Promise<void> {
		try {
			if (toStage.length) {
				await this.git.add(toStage);
			}
			if (toUnstage.length) {
				await this.git.reset(['--', ...toUnstage]);
			}
		} catch (error) {
			new Notice('Error while staging: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public async getBranches(): Promise<string[]> {
		try {
			const result = await this.git.branchLocal();
			return result.all;
		} catch (error) {
			new Notice('Error while listing branches: ' + error.message.substring(0, 300));
			console.error(error);
			return [];
		}
	}

	public async checkout(branchName: string): Promise<void> {
		try {
			new Notice('Switching to branch: ' + branchName);
			await this.git.checkout(branchName);
			const message = 'Switched to branch: ' + branchName;
			new Notice(message);
			console.log(message);
		} catch (error) {
			new Notice('Error while switching branch: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public async pullAndCreateBranch(branchName: string): Promise<void> {
		await this.pull();
		await this.createBranch(branchName);
	}

	public async createBranch(branchName: string): Promise<void> {
		try {
			new Notice('Creating branch: ' + branchName);
			await this.git.checkoutLocalBranch(branchName);
			await this.git.push('origin', branchName, {'-u': null});
			const message = 'Created branch: ' + branchName;
			new Notice(message);
			console.log(message);
		} catch (error) {
			new Notice('Error while creating a new branch: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public async pull(): Promise<void> {
		try {
			new Notice('Pulling updates from the remote repository');
			const result = await this.git.pull();

			let message;
			if (!!result && !!result.summary &&
				!result.summary.insertions &&
				!result.summary.changes &&
				!result.summary.deletions)
			{
				message = 'Everything is up-to-date';
			} else if (!!result && !!result.summary) {
				message = `${result.summary.changes} files updated\n`;
			} else {
				message ='Repository updated';
			}

			new Notice(message);
			console.log(message);
		} catch (error) {
			new Notice('Error while pulling updates from the remote repository: ' + error.message.substring(0, 300));
			console.error(error);
		}
	}

	public getBranchType(): string {
		const split = (this.getBranchNameSync()).split('/');
		return split[0].trim();
	}

	public async getBranchName(): Promise<string> {
		return (await this.git.branch()).current.trim();
	}

	public getBranchNameSync(): string {
		return this.shellExecSync('git branch --show-current').trim();
	}

	public getCurrentUser(): string {
		return this.shellExecSync('git config user.name').trim();
	}

	public shellExecSync(query: string, newPath?: string): string {
		const sep = Platform.isWin ? ';' : ':';
		const env = newPath
			? { ...this.env, PATH: `${this.env.PATH}${sep}${newPath}` }
			: this.env;
		try {
			return execSync(query, { cwd: this.basePath, env }).toString();
		} catch (error) {
			return error.message;
		}
	}
}
