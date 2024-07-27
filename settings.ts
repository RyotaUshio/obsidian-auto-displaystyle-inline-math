import { PluginSettingTab, Setting, App, Component, MarkdownRenderer } from 'obsidian';

import AutoDisplaystyleInlineMathPlugin from 'main'

export interface AutoDisplaystyleInlineMathSettings {
	front: boolean;
	superscript: boolean,
	subscript: boolean,
	additionalFunctionNames: string;
}

export const DEFAULT_SETTINGS: AutoDisplaystyleInlineMathSettings = {
	front: true,
	superscript: false,
	subscript: false,
	additionalFunctionNames: '',
};

export class AutoDisplaystyleInlineMathSettingTab extends PluginSettingTab {
	plugin: AutoDisplaystyleInlineMathPlugin;
    component: Component;
    promises: Promise<any>[];
  
	constructor(app: App, plugin: AutoDisplaystyleInlineMathPlugin) {
		super(app, plugin);
		this.plugin = plugin;
        this.component = new Component();
        this.promises = [];
	}
  
	display(): void {
		let { containerEl } = this;
  
		containerEl.empty();

		new Setting(containerEl)
			.setName("Front")
			.setDesc("Whether to add \\displaystyle at the front of an inline math.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.front)
				.onChange(async (value) => {
					this.plugin.settings.front = value;
					await this.plugin.saveSettings();
					this.plugin.rerender();
            }))
            .then((setting) => {
				this.renderMarkdown([
                    'How it works:  `$\\sum_{i=1}^{N} i^{2}$` -> `$\\displaystyle \\sum_{i=1}^{N} i^{2}$`',
                    'Effect:  $\\sum_{i=1}^{N} i^{2}$ -> $\\displaystyle \\sum_{i=1}^{N} i^{2}$',
				], setting.descEl);
			});

		new Setting(containerEl)
			.setName("Superscript")
			.setDesc("Whether to add \\displaystyle to each superscript in an inline math.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.superscript)
				.onChange(async (value) => {
					this.plugin.settings.superscript = value;
					await this.plugin.saveSettings();
					this.plugin.rerender();
			}))
            .then((setting) => {
				this.renderMarkdown([
                    'How it works: `$2^{3^4}$` -> `$2^{\\displaystyle 3^{\\displaystyle 4}}$`',
                    'Effect: $2^{3^4}$ -> $2^{\\displaystyle 3^{\\displaystyle 4}}$',
				], setting.descEl);
			});

		new Setting(containerEl)
			.setName("Subscript")
			.setDesc("Whether to add \\displaystyle to each subscript in an inline math.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.subscript)
				.onChange(async (value) => {
					this.plugin.settings.subscript = value;
					await this.plugin.saveSettings();
					this.plugin.rerender();
            }))
            .then((setting) => {
				this.renderMarkdown([
                    'How it works: `$n_{a_{k+1}}$` -> `$n_{ \\displaystyle a_{\\displaystyle k+1}}$`',
                    'Effect: $n_{a_{k+1}}$ -> $n_{\\displaystyle a_{\\displaystyle k+1}}$',
				], setting.descEl);
			});

		new Setting(containerEl)
			.setName("Additional functions to be prepended with \\displaystyle")
			.setDesc("A list of function names (separated by commas), where each instance of these functions in an inline math will be prepended with \\displaystyle.")
			.addText((text) => {
                text
                    .setPlaceholder('example: frac, binom')
                    .setValue(this.plugin.settings.additionalFunctionNames)
                    .onChange(async (value) => {
                        this.plugin.settings.additionalFunctionNames = value;

                        await this.plugin.saveSettings();
                });  

                this.component.registerDomEvent(text.inputEl, 'blur', () => {
                    this.plugin.rerender();
                });
                this.component.registerDomEvent(text.inputEl, 'keypress', (evt) => {
                    if (evt.key === 'Enter') {
                        this.plugin.rerender();
                    }
                });
            })
            .then((setting) => {
				this.renderMarkdown([
                    'How it works: `$\\frac{2 + \\binom{n}{i}}{1 + \\frac{3}{4}}$` -> `$\\displaystyle \\frac{2 + \\displaystyle \\binom{n}{i}}{1 + \\displaystyle \\frac{3}{4}}$`',
                    'Effect: $\\frac{2 + \\binom{n}{i}}{1 + \\frac{3}{4}}$ -> $\\displaystyle \\frac{2 + \\displaystyle \\binom{n}{i}}{1 + \\displaystyle \\frac{3}{4}}$',
				], setting.descEl);
			});
            
	}

    async renderMarkdown(lines: string[] | string, el: HTMLElement) {
        // temporarily disable the plugin
        // because I need to use the original rendering in plugin settings tab 
        this.plugin.uninstaller?.();
        this.promises.push(this._renderMarkdown(lines, el));
        el.addClass('markdown-rendered');
        // enable the plugin again
        this.plugin.install();
    }

    async _renderMarkdown(lines: string[] | string, el: HTMLElement) {
		await MarkdownRenderer.render(this.app, Array.isArray(lines) ? lines.join('\n') : lines, el, '', this.component);
		if (el.childNodes.length === 1 && el.firstChild instanceof HTMLParagraphElement) {
			el.replaceChildren(...el.firstChild.childNodes);
		}
	}
}
