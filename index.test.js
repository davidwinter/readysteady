import process from 'node:process';

import test from 'ava';

/* eslint-disable import/first */
process.env.GITHUB_TOKEN = process.env.SMOKE_TEST_TOKEN;

import readySteady, {
	isTagAvailable,
	getExistingDraftRelease,
	deleteDraftRelease,
	createDraftRelease,
	uploadFilesToDraftRelease,
} from './index.js';
/* eslint-enable */

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

	const result = await isTagAvailable({
		client,
		owner: 'davidwinter',
		repo: 'readysteady',
		tag: 'v3.1.1',
	});

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

	const result = await isTagAvailable({
		client,
		owner: 'davidwinter',
		repo: 'readysteady',
		tag: 'v3.1.1',
	});

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

	const result = await getExistingDraftRelease({
		client,
		owner: 'davidwinter',
		repo: 'readysteady',
		releaseName: '3.1.1',
	});

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

	const result = await getExistingDraftRelease({
		client,
		owner: 'davidwinter',
		repo: 'readysteady',
		releaseName: '3.1.1',
	});

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

	const result = await deleteDraftRelease({
		client,
		owner: 'davidwinter',
		repo: 'readysteady',
		release: {id: 1},
	});

	t.is(result, true);
});

test('throws error if deletion fails as release is not a draft', async t => {
	const client = {};
	const release = {
		draft: false,
	};

	const error = await t.throwsAsync(async () => {
		await deleteDraftRelease({
			client,
			owner: 'davidwinter',
			repo: 'readysteady',
			release,
		});
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

	const release = await createDraftRelease({
		client,
		owner: 'davidwinter',
		repo: 'readysteady',
		tag: 'v3.1.1',
		releaseName: '3.1.1',
	});

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

	const error = await t.throwsAsync(async () => {
		await createDraftRelease({
			client,
			owner: 'davidwinter',
			repo: 'readysteady',
			tag: 'v3.1.1',
			releaseName: '3.1.1',
		});
	});

	t.is(error.message, 'something went wrong');
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
		statSync: () => 123,
	};

	const release = {
		data: {
			id: 1,
			draft: true,
		},
	};

	const result = await uploadFilesToDraftRelease({
		client,
		fs,
		owner: 'davidwinter',
		repo: 'readysteady',
		release,
		files: ['./README.md'],
	});

	t.truthy(result);
});

test('will not upload files to a non-draft release', async t => {
	const client = {};
	const fs = {};

	const release = {
		data: {
			id: 1,
			draft: false,
		},
	};

	const error = await t.throwsAsync(async () => {
		await uploadFilesToDraftRelease({
			client,
			fs,
			owner: 'davidwinter',
			repo: 'readysteady',
			release,
			files: ['./README.md'],
		});
	});

	t.is(error.message, 'release is not a draft');
});

test('it will create a draft release with files', async t => {
	const release = await readySteady({
		owner: 'davidwinter',
		repo: 'readysteady-smoke-tests',
		tag: 'v3.1.1',
		force: true,
		files: ['./README.md'],
	});

	t.is(release.name, '3.1.1');
	t.is(release.draft, true);
	t.is(release.assets[0].name, 'README.md');
});
