/* eslint-disable no-var */
/* eslint-disable prefer-const */
import {
	App,
	Editor,
	Plugin,
	normalizePath,
	PluginSettingTab,
	Setting,
} from "obsidian";

import * as path from "path";
import * as jetpack from "fs-jetpack";
import { clipboard } from "electron";
// import { readFilePaths } from "electron-clipboard-ex";

interface MarkdownMediaSettings {
	width: string;
}

var DEFAULT_SETTINGS: Partial<MarkdownMediaSettings> = {
	width: "300",
};

export default class MarkdownMedia extends Plugin {
	settings: MarkdownMediaSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new MarkdownMediaSettingTab(this.app, this));

		this.addCommand({
			id: "insert-media-markdown",
			name: "Insert media markdown",
			editorCallback: (editor: Editor) => {
				let sourceFileDataMap = new Map();
				let sourceFilePaths = this.sourceFilePaths();

				// sourceFilePaths = readFilePaths();
				// console.log(sourceFilePaths);

				for (let sourceFilePath of sourceFilePaths) {
					sourceFileDataMap.set(
						sourceFilePath,
						path.parse(sourceFilePath)
					);
				}
				// copy file, and insert markdown syntax at cursor position
				for (let [key, value] of sourceFileDataMap) {
					jetpack.copy(
						key,
						normalizePath(
							`${this.destinationPath()}/${value.base}`
						),
						{
							overwrite: (srcInspectData, destInspectData) => {
								return (
									srcInspectData.modifyTime >
									destInspectData.modifyTime
								);
							},
						}
					);
					if (this.isImageURL(value.ext)) {
						editor.replaceRange(
							`![${value.name}${
								this.settings.width
									? `|${this.settings.width}`
									: ""
							}](${value.base})\n`,
							editor.getCursor()
						);
					} else {
						editor.replaceRange(
							`[${value.name}](${value.base})\n`,
							editor.getCursor()
						);
					}
				}
			},
		});
	}

	destinationPath() {
		let vaultPath = app.vault.adapter.getBasePath();
		let activeFileParentFolder = app.workspace.getActiveFile()?.parent.path;
		let destinationPath = path.format({
			dir: vaultPath,
			base: `${activeFileParentFolder}/media`,
		});
		return normalizePath(destinationPath);
	}

	sourceFilePaths() {
		// read properties of clipboard files
		// https://github.com/njzydark/Aragorn/blob/afe4a60972b4255dd417480ca6aca2af1fd8e637/packages/aragorn-app-main/src/uploaderManager.ts#L88

		let filePath;
		if (process.platform === "darwin") {
			// https://github.com/electron/electron/issues/9035#issuecomment-359554116
			filePath =
				clipboard
					.read("NSFilenamesPboardType")
					.match(/<string>.*<\/string>/g)
					?.map((item) => item.replace(/<string>|<\/string>/g, "")) ||
				[];
		} else {
			// currently not working in win
			// https://github.com/electron/electron/issues/9035#issuecomment-536135202
			// https://docs.microsoft.com/en-us/windows/win32/shell/clipboard#cf_hdrop
			// https://www.codeproject.com/Reference/1091137/Windows-Clipboard-Formats
			// console.log(clipboard.read("CF_HDROP"));
			// let rawFilePathStr = clipboard.read("CF_HDROP") || "";
			// let formatFilePathStr = [...rawFilePathStr]
			// 	.filter((_, index) => rawFilePathStr.charCodeAt(index) !== 0)
			// 	.join("")
			// 	.replace(/\\/g, "\\");
			// const drivePrefix = formatFilePathStr.match(/[a-zA-Z]:\\/);
			// if (drivePrefix) {
			// 	const drivePrefixIndex = formatFilePathStr.indexOf(
			// 		drivePrefix[0]
			// 	);
			// 	if (drivePrefixIndex !== 0) {
			// 		formatFilePathStr =
			// 			formatFilePathStr.substring(drivePrefixIndex);
			// 	}
			// 	filePath = formatFilePathStr
			// 		.split(drivePrefix[0])
			// 		.filter((item) => item)
			// 		.map((item) => drivePrefix + item);
			// }
		}
		return filePath;
	}

	isImageURL(string: string) {
		return (
			string.match(
				/\.(jpeg|jpg|gif|png|tif|tiff|bmp|eps|raw|apng|avif|jfif|pjpeg|pjp|svg|webp)$/
			) != null
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class MarkdownMediaSettingTab extends PluginSettingTab {
	plugin: MarkdownMedia;

	constructor(app: App, plugin: MarkdownMedia) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Image Width")
			.setDesc("Default Image Width to Display")
			.addText((text) =>
				text
					.setPlaceholder("300")
					.setValue(this.plugin.settings.width)
					.onChange(async (value) => {
						this.plugin.settings.width = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
