import { MarkdownView, Plugin, loadMathJax } from 'obsidian';
import { around } from 'monkey-around';

export default class MyPlugin extends Plugin {
	uninstaller: (() => void) | null;

	async onload() {
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
		// @ts-ignore
		this.register(this.uninstaller = around(MathJax, {
			tex2chtml(old: Function) {
				return function (source: string, options: any): HTMLElement {
					// I intentionally avoided "if (!options.display)" because MathJax.tex2chtml() seems to 
					// return a display math even when "options" does not have "display" property.
					if (options.display === false) source = '\\displaystyle ' + source;
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
}
