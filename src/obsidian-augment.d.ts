import 'obsidian';

declare module 'obsidian' {
	interface App {
		/** Read vault-scoped data from localStorage. */
		loadLocalStorage(key: string): string | null;
		/** Write vault-scoped data to localStorage. Passing undefined removes the key. */
		saveLocalStorage(key: string, value: string | undefined): void;
	}
}
