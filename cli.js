#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

import ora from 'ora';
import meow from 'meow';

import client from './client.js';
import * as readysteady from './index.js';

const cli = meow({
	importMeta: import.meta,
	flags: {
		owner: {
			type: 'string',
			isRequired: true,
		},
		repo: {
			type: 'string',
			isRequired: true,
		},
		tag: {
			type: 'string',
			isRequired: true,
		},
		force: {
			type: 'boolean',
			default: false,
		},
		files: {
			type: 'string',
			isMultiple: true,
			default: [],
		},
	},
});

const {owner, repo, tag, force, files} = cli.flags;

(async () => {
	let spinner = null;
	spinner = createSpinner(`Check if tag is available: ${tag}`);

	try {
		if (!await readysteady.isTagAvailable({client, owner, repo, tag})) {
			throw new Error(`Tag is not available: ${tag}`);
		}

		spinner.succeed(`Tag available: ${tag}`);

		const releaseName = tag.slice(1);

		spinner = createSpinner(`Check if draft release is available: ${releaseName}`);

		const existingDraftRelease = await readysteady.getExistingDraftRelease({client, owner, repo, releaseName});

		if (existingDraftRelease) {
			spinner.info(`Draft release already exists: ${releaseName}`);

			if (force) {
				spinner.info('--force detected, deleting existing draft release');
				await readysteady.deleteDraftRelease({client, owner, repo, release: existingDraftRelease});
				spinner.succeed('Existing draft release deleted');
			} else {
				throw new Error('existing draft release found, and force not used');
			}
		}

		spinner = createSpinner(`Create draft release: ${releaseName}`);

		const newDraftRelease = await readysteady.createDraftRelease({client, owner, repo, tag, releaseName});

		spinner.succeed(`Draft release created: ${releaseName} ${newDraftRelease.url}`);

		spinner = createSpinner('Uploading files');

		await readysteady.uploadFilesToDraftRelease({client, fs, owner, repo, release: newDraftRelease, files});

		spinner.succeed('Files uploaded to draft release');
	} catch (error) {
		spinner.fail(error.message);
		process.exit(1);
	}
})();

function createSpinner(text) {
	return ora(text).start();
}
