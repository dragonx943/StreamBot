import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";
import config from "../config.js";
import logger from "../utils/logger.js";

export default class ConfigCommand extends BaseCommand {
	name = "config";
	description = "View or adjust bot configuration parameters (Admin only)";
	usage = "config [parameter] [value]";
	aliases = ["cfg", "set"];

	async execute(context: CommandContext): Promise<void> {
		// Check if user is an admin
		if (!this.isAdmin(context.message.author.id)) {
			await this.sendError(context.message, "You don't have permission to use this command. Admin access required.");
			logger.warn(`Unauthorized config command attempt by user ${context.message.author.id}`);
			return;
		}

		const args = context.args;

		// If no arguments, show current config
		if (args.length === 0) {
			await this.showConfig(context);
			return;
		}

		// If one argument, show specific parameter
		if (args.length === 1) {
			await this.showParameter(context, args[0]);
			return;
		}

		// If two or more arguments, set parameter
		const parameter = args[0].toLowerCase();
		const value = args.slice(1).join(' ');
		await this.setParameter(context, parameter, value);
	}

	private async showConfig(context: CommandContext): Promise<void> {
		const configInfo = [
			"**Stream Options:**",
			`• respect_video_params: ${config.respect_video_params}`,
			`• width: ${config.width}`,
			`• height: ${config.height}`,
			`• fps: ${config.fps}`,
			`• bitrateKbps: ${config.bitrateKbps}`,
			`• maxBitrateKbps: ${config.maxBitrateKbps}`,
			`• hardwareAcceleratedDecoding: ${config.hardwareAcceleratedDecoding}`,
			`• h26xPreset: ${config.h26xPreset}`,
			`• videoCodec: ${config.videoCodec}`,
			"",
			"**General Options:**",
			`• videosDir: ${config.videosDir}`,
			`• previewCacheDir: ${config.previewCacheDir}`,
			"",
			"Use `config <parameter>` to view a specific parameter",
			"Use `config <parameter> <value>` to change a parameter"
		].join('\n');

		await this.sendInfo(context.message, 'Bot Configuration', configInfo);
	}

	private async showParameter(context: CommandContext, parameter: string): Promise<void> {
		const param = parameter.toLowerCase();
		const configKeys = this.getConfigKeys();

		if (!configKeys.includes(param)) {
			await this.sendError(context.message, `Unknown parameter: ${parameter}`);
			return;
		}

		const value = (config as any)[param];
		await this.sendInfo(context.message, `Config: ${parameter}`, `Current value: \`${value}\``);
	}

	private async setParameter(context: CommandContext, parameter: string, value: string): Promise<void> {
		const param = parameter.toLowerCase();

		try {
			switch (param) {
				// Boolean parameters
				case 'respect_video_params':
				case 'hardwareacceleration':
				case 'hardwareaccelerateddecoding':
					const boolValue = this.parseBoolean(value);
					if (param === 'hardwareacceleration' || param === 'hardwareaccelerateddecoding') {
						config.hardwareAcceleratedDecoding = boolValue;
						await this.sendSuccess(context.message, `Set hardwareAcceleratedDecoding to \`${boolValue}\``);
					} else {
						(config as any)[param] = boolValue;
						await this.sendSuccess(context.message, `Set ${parameter} to \`${boolValue}\``);
					}
					logger.info(`Config updated: ${parameter} = ${boolValue}`);
					break;

				// Number parameters
				case 'width':
				case 'height':
				case 'fps':
				case 'bitratekbps':
				case 'maxbitratekbps':
					const numValue = parseInt(value);
					if (isNaN(numValue) || numValue <= 0) {
						await this.sendError(context.message, `Invalid number value: ${value}`);
						return;
					}
					(config as any)[param] = numValue;
					await this.sendSuccess(context.message, `Set ${parameter} to \`${numValue}\``);
					logger.info(`Config updated: ${parameter} = ${numValue}`);
					break;

				// Video codec
				case 'videocodec':
					const codec = this.parseVideoCodec(value);
					if (!codec) {
						await this.sendError(context.message, `Invalid video codec. Valid options: VP8, H264, H265`);
						return;
					}
					config.videoCodec = codec;
					await this.sendSuccess(context.message, `Set videoCodec to \`${codec}\``);
					logger.info(`Config updated: videoCodec = ${codec}`);
					break;

				// H26x preset
				case 'h26xpreset':
				case 'preset':
					const preset = this.parsePreset(value);
					if (!preset) {
						await this.sendError(context.message, `Invalid preset. Valid options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow`);
						return;
					}
					config.h26xPreset = preset;
					await this.sendSuccess(context.message, `Set h26xPreset to \`${preset}\``);
					logger.info(`Config updated: h26xPreset = ${preset}`);
					break;

				// String parameters
				case 'videosdir':
				case 'previewcachedir':
					(config as any)[param] = value;
					await this.sendSuccess(context.message, `Set ${parameter} to \`${value}\``);
					logger.info(`Config updated: ${parameter} = ${value}`);
					break;

				default:
					await this.sendError(context.message, `Cannot modify parameter: ${parameter}`);
					return;
			}
		} catch (error) {
			logger.error(`Error setting config parameter ${parameter}:`, error);
			await this.sendError(context.message, `Failed to set ${parameter}: ${error}`);
		}
	}

	private getConfigKeys(): string[] {
		return [
			'respect_video_params',
			'width',
			'height',
			'fps',
			'bitratekbps',
			'maxbitratekbps',
			'hardwareaccelerateddecoding',
			'hardwareacceleration',
			'h26xpreset',
			'preset',
			'videocodec',
			'videosdir',
			'previewcachedir'
		];
	}

	private parseBoolean(value: string): boolean {
		const val = value.trim().toLowerCase();
		return val === 'true' || val === '1' || val === 'yes' || val === 'on';
	}

	private parseVideoCodec(value: string): "VP8" | "H264" | "H265" | null {
		const VALID_VIDEO_CODECS = ['VP8', 'H264', 'H265'];
		const codec = value.trim().toUpperCase();
		if (VALID_VIDEO_CODECS.includes(codec)) {
			return codec as "VP8" | "H264" | "H265";
		}
		return null;
	}

	private parsePreset(value: string): "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow" | null {
		const VALID_PRESETS = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];
		const preset = value.trim().toLowerCase();
		if (VALID_PRESETS.includes(preset)) {
			return preset as "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow";
		}
		return null;
	}

	private isAdmin(userId: string): boolean {
		// If no admins configured, allow all users (backwards compatibility)
		if (!config.adminIds || config.adminIds.length === 0) {
			return true;
		}
		return config.adminIds.includes(userId);
	}
}
