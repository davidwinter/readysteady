#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

import Ora from 'ora';
import meow from 'meow';
import updateNotifier from 'update-notifier';
import readJson from 'read-package-json';

import createClient from './client.js';
import * as readysteady from './index.js';

readJson('./package.json', (error, data) => {
	updateNotifier({pkg: data});
});

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
	spinner = createSpinner('Checking for GitHub authentication token');

	try {
		const client = createClient();

		spinner.succeed('GitHub authentication token detected');

		spinner = createSpinner(`Checking that tag is available: ${tag}`);

		if (!await readysteady.isTagAvailable({client, owner, repo, tag})) {
			throw new Error(`Tag is not available and has already been used: ${tag}`);
		}

		spinner.succeed(`Tag is available for a draft release: ${tag}`);

		const releaseName = tag.slice(1);

		spinner = createSpinner(`Checking if draft release is available: ${releaseName}`);

		const existingDraftRelease = await readysteady.getExistingDraftRelease({client, owner, repo, releaseName});

		if (existingDraftRelease) {
			spinner.info(`A draft release already exists: ${releaseName}`);

			if (force) {
				spinner.info('--force flag detected, deleting the existing draft release');
				await readysteady.deleteDraftRelease({client, owner, repo, release: existingDraftRelease});
				spinner.succeed('Existing draft release deleted');
			} else {
				throw new Error('An existing draft release was found. Use --force to delete and replace with a new draft release');
			}
		}

		spinner = createSpinner(`Creating a new draft release: ${releaseName}`);

		const newDraftRelease = await readysteady.createDraftRelease({client, owner, repo, tag, releaseName});

		spinner.succeed(`A new draft release was created: ${releaseName}`);

		if (files.length > 0) {
			spinner = createSpinner('Uploading files to the draft release');

			await readysteady.uploadFilesToDraftRelease({client, fs, owner, repo, release: newDraftRelease, files});

			spinner.succeed('Files uploaded to draft release');
		}

		console.log('\nDraft release successfully created 🎉');

		console.log(`You can edit the release here: ${newDraftRelease.data.html_url.replace('/tag/', '/edit/')}\n`);
	} catch (error) {
		spinner.fail(error.message);
		process.exit(1);
	}
})();

function createSpinner(text) {
	return (new Ora(text)).start();
}
