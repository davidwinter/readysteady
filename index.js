import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

import {Octokit} from '@octokit/core';
import {restEndpointMethods} from '@octokit/plugin-rest-endpoint-methods';
import {paginateRest} from '@octokit/plugin-paginate-rest';

const readySteady = async ({owner, repo, tag, force = false, files} = {}) => {
	const MyOctokit = Octokit.plugin(restEndpointMethods, paginateRest);
	const client = new MyOctokit({auth: process.env.GITHUB_TOKEN});

	if (!await isTagAvailable({client, owner, repo, tag})) {
		throw new Error(`tag is not available: ${tag}`);
	}

	const releaseName = tag.slice(1);

	const existingDraftRelease = await getExistingDraftRelease({client, owner, repo, releaseName});

	if (existingDraftRelease) {
		if (force) {
			await deleteDraftRelease({client, owner, repo, release: existingDraftRelease});
		} else {
			throw new Error('existing draft release found, and force not used');
		}
	}

	const newDraftRelease = await createDraftRelease({client, owner, repo, tag, releaseName});

	await uploadFilesToDraftRelease({client, fs, owner, repo, release: newDraftRelease, files});

	return getExistingDraftRelease({client, owner, repo, releaseName});
};

const isTagAvailable = async ({client, owner, repo, tag} = {}) => {
	try {
		await client.rest.repos.getReleaseByTag({
			owner,
			repo,
			tag,
		});

		return false;
	} catch {
		return true;
	}
};

const getExistingDraftRelease = async ({client, owner, repo, releaseName} = {}) => {
	const iterator = client.paginate.iterator(client.rest.repos.listReleases, {
		owner,
		repo,
		per_page: 100, // eslint-disable-line camelcase
	});

	let existingDraft = null;

	for await (const {data: releases} of iterator) {
		if (existingDraft !== null) {
			break;
		}

		for (const release of releases) {
			if (existingDraft !== null) {
				break;
			}

			if (release.name === releaseName && release.draft) {
				existingDraft = release;
			}
		}
	}

	return existingDraft;
};

const deleteDraftRelease = async ({client, owner, repo, release} = {}) => {
	if (release.draft === false) {
		throw new Error('release is not a draft');
	}

	await client.rest.repos.deleteRelease({
		owner,
		repo,
		release_id: release.id, // eslint-disable-line camelcase
	});

	return true;
};

const createDraftRelease = async ({client, owner, repo, tag, releaseName} = {}) => {
	try {
		const release = await client.rest.repos.createRelease({
			owner,
			repo,
			tag_name: tag, // eslint-disable-line camelcase
			name: releaseName,
			draft: true,
			prerelease: false,
		});

		return release;
	} catch {
		return false;
	}
};

const uploadFilesToDraftRelease = async ({client, fs, owner, repo, release, files} = {}) => {
	if (release.data.draft === false) {
		throw new Error('release is not a draft');
	}

	const uploads = [];

	for (const file of files) {
		const fileData = fs.readFileSync(file);

		const stats = fs.statSync(file);

		uploads.push(client.rest.repos.uploadReleaseAsset({
			owner,
			repo,
			release_id: release.data.id, // eslint-disable-line camelcase
			name: path.basename(file),
			data: fileData,
			headers: {
				'Content-Length': stats.size,
			},
		}));
	}

	return Promise.all(uploads);
};

export default readySteady;

export {
	isTagAvailable,
	getExistingDraftRelease,
	deleteDraftRelease,
	createDraftRelease,
	uploadFilesToDraftRelease,
};
