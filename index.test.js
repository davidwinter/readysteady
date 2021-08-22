import test from 'ava';

import {Octokit} from '@octokit/core';
import {restEndpointMethods} from '@octokit/plugin-rest-endpoint-methods';
import {paginateRest} from '@octokit/plugin-paginate-rest';

import readySteady from './index.js';

import {
	isTagAvailable,
	getExistingDraftRelease,
	deleteDraftRelease,
	createDraftRelease,
	uploadFilesToDraftRelease,
} from './index.js';

test('passes if tag is available', async t => {
	const client = {
		rest: {
			repos: {
				getReleaseByTag: (_owner, _repo, _tag) => {
					throw new Error('404');
				},
			},
		},
	};

	const result = await isTagAvailable(client, 'davidwinter', 'nimblenote', 'v3.1.1');

	t.is(result, true);
});

test('fails if tag is not available', async t => {
	const client = {
		rest: {
			repos: {
				getReleaseByTag: async (_owner, _repo, _tag) => true,
			},
		},
	};

	const result = await isTagAvailable(client, 'davidwinter', 'nimblenote', 'v3.1.1');

	t.is(result, false);
});

test('returns existing draft release if it exists', async t => {
	const pageIterator = {
		releases: [{
			data: [{
				id: 1,
				name: '3.1.1',
				draft: true,
			}],
		}],
		[Symbol.asyncIterator]() {
			return {
				done: false,
				releases: this.releases,

				next() {
					return (this.done) ? {done: true} : {done: false, value: this.releases[0]};
				},
			};
		},
	};

	const client = {
		paginate: {
			iterator: () => pageIterator,
		},
		rest: {
			repos: {
				listReleases: null,
			},
		},
	};

	const result = await getExistingDraftRelease(client, 'davidwinter', 'nimblenote', '3.1.1');

	t.is(result.id, 1);
});

test('returns null if no existing draft release exists', async t => {
	const pageIterator = {
		[Symbol.asyncIterator]() {
			return {
				next() {
					return {done: true};
				},
			};
		},
	};

	const client = {
		paginate: {
			iterator: () => pageIterator,
		},
		rest: {
			repos: {
				listReleases: null,
			},
		},
	};

	const result = await getExistingDraftRelease(client, 'davidwinter', 'nimblenote', '3.1.1');

	t.is(result, null);
});


test('passes if release is deleted', async t => {
	const client = {
		rest: {
			repos: {
				deleteRelease: async (_owner, _repo, _releaseId) => true,
			},
		},
	};

	const result = await deleteDraftRelease(client, 'davidwinter', 'nimblenote', {id: 1});

	t.is(result, true);
});

test('throws error if deletion fails as release is not a draft', async t => {
	const client = {};
	const release = {
		draft: false,
	};

	const error = await t.throwsAsync(async () => {
		await deleteDraftRelease(client, 'davidwinter', 'nimblenote', release);
	});

	t.is(error.message, 'release is not a draft');
});

test('creates a release', async t => {
	const client = {
		rest: {
			repos: {
				createRelease: async () => ({name: '3.1.1'}),
			},
		},
	};

	const release = await createDraftRelease(client, 'davidwinter', 'nimblenote', 'v3.1.1', '3.1.1');

	t.is(release.name, '3.1.1');
});

test('fails if unable to create a release', async t => {
	const client = {
		rest: {
			repos: {
				createRelease: async () => {
					throw new Error('something went wrong');
				},
			},
		},
	};

	const release = await createDraftRelease(client, 'davidwinter', 'nimblenote', 'v3.1.1', '3.1.1');

	t.is(release, false);
});

test('able to upload files to a release', async t => {
	const client = {
		rest: {
			repos: {
				uploadReleaseAsset: async () => true,
			},
		},
	};

	const fs = {
		readFileSync: () => 'test',
	};

	const release = {
		data: {
			id: 1,
			draft: true,
		},
	};

	const result = await uploadFilesToDraftRelease(client, fs, 'davidwinter', 'nimblenote', release, ['./README.md']);

	t.truthy(result);
});

test('will not upload files to a non-draft release', async t => {
	const client = {};
	const fs = {};

	const release = {
		id: 1,
		draft: false,
	};

	const error = await t.throwsAsync(async () => {
		await uploadFilesToDraftRelease(client, fs, 'davidwinter', 'nimblenote', release, ['./README.md']);
	});

	t.is(error.message, 'release is not a draft');
});

test('it will create a draft release with files', async t => {
	const MyOctokit = Octokit.plugin(restEndpointMethods, paginateRest);
	const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });

	const release = await readySteady(octokit, 'davidwinter', 'nimblenote', 'v3.1.1', true, ['./README.md']);

	t.is(release.data.name, '3.1.1');
});
