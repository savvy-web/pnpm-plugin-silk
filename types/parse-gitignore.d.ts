declare module "parse-gitignore" {
	interface Section {
		readonly name: string;
		readonly comment: string;
		readonly patterns: string[];
	}

	interface GitignoreState {
		readonly sections: Section[];
		readonly patterns: string[];
		readonly input: Buffer;
	}

	function parseGitignore(input: string | Buffer): GitignoreState;

	export default parseGitignore;
}
