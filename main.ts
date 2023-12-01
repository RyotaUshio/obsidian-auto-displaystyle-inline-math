import { Plugin, loadMathJax } from 'obsidian';
import { around } from 'monkey-around';

export default class MyPlugin extends Plugin {
	async onload() {
		await loadMathJax();

		// @ts-ignore
		this.register(around(MathJax, {
			tex2chtml(old: Function) {
				return function(source: string, options: any): HTMLElement {
					if (options.display === false) source = '\\displaystyle ' + source;
					return old(source, options);
				}
			}
		}));
	}
}
