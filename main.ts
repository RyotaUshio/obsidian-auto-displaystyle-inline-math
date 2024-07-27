import { MarkdownView, Plugin, loadMathJax} from 'obsidian';
import { around } from 'monkey-around';

import { AutoDisplaystyleInlineMathSettings, AutoDisplaystyleInlineMathSettingTab, DEFAULT_SETTINGS } from 'settings'

export default class AutoDisplaystyleInlineMathPlugin extends Plugin {
	settings: AutoDisplaystyleInlineMathSettings;

	uninstaller: (() => void) | null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new AutoDisplaystyleInlineMathSettingTab(this.app, this));

		await loadMathJax();
		this.install();
		this.rerender();

		this.addCommand({
			id: 'enable',
			name: 'Enable',
			checkCallback: (checking) => {
				if (!this.uninstaller) {
					if (!checking) {
						this.install();
						this.rerender();
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: 'disable',
			name: 'Disable',
			checkCallback: (checking) => {
				if (this.uninstaller) {
					if (!checking) {
						this.uninstaller();
						this.uninstaller = null;
						this.rerender();
					}
					return true;
				}
				return false;
			},
		});
	}

	onunload() {
		this.uninstaller?.();
		this.rerender();
	}

	install() {
		const settings: AutoDisplaystyleInlineMathSettings = this.settings;

		// @ts-ignore
		this.register(this.uninstaller = around(MathJax, {
			tex2chtml(old: Function) {
				return function (source: string, options: any): HTMLElement {
					// I intentionally avoided "if (!options.display)" because MathJax.tex2chtml() seems to 
					// return a display math even when "options" does not have "display" property.
					if (options.display === false) {
						if (settings.front) 
							source = '\\displaystyle ' + source;

						if (settings.superscript) {
							// eg: $x^2$ -> $x^{\displaystyle 2}$
							source = source.replace(/\^\s*\{/g, "\^{\\displaystyle ");
							// eg: $x^{10}$ -> $x^{\displaystyle 10}$
							source = source.replace(/\^\s*([^\{])/g, "\^\{\\displaystyle $1\}");
						}

						if (settings.subscript) {
							// eg: $n^i$ -> $n^{\displaystyle i}$
							source = source.replace(/_\s*\{/g, "_\{\\displaystyle ");
							// eg: $n^{k+1}$ -> $n^{\displaystyle k+1}$
							source = source.replace(/_\s*([^\{])/g, "_\{\\displaystyle $1\}");
						}
						
						// eg: additionalFunctionNames == 'frac, binom, '
						const FunctionNameList: string[] = settings.additionalFunctionNames
							.replace(/\s/g,"")  // 'frac,binom,'
							.split(",")   // ['frac', 'binom']
							.filter(keyword => keyword != '') // avoid empty string or string containing only commas
						if (FunctionNameList.length != 0) {
							// \(frac|binom)
							const regex = new RegExp(`(\\\\(${FunctionNameList.join('|')}))\\b`, 'g');
							// $\frac{2 + \binom{n}{i}}{1 + \frac{3}{4}}$ -> 
							// $\displaystyle \frac{2 + \displaystyle \binom{n}{i}}{1 + \displaystyle \frac{3}{4}}$ 
							source = source.replace(regex, "\\displaystyle $1");
						}
					}

					return old(source, options);
				}
			}
		}));
	}

	async rerender() {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view as MarkdownView;
			const state = view.getState();
			const eState = view.getEphemeralState();
			view.previewMode.rerender(true);
			const editor = view.editor;
			editor.setValue(editor.getValue());
			if (state.mode === 'preview') {
				// Temporarily switch to Editing view and back to Reading view
				// to avoid Properties to be hidden
				state.mode = 'source';
				await view.setState(state, { history: false });
				state.mode = 'preview';
				await view.setState(state, { history: false });
			}
			view.setEphemeralState(eState);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
