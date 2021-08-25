import process from 'node:process';

import {Octokit} from '@octokit/core';
import {restEndpointMethods} from '@octokit/plugin-rest-endpoint-methods';
import {paginateRest} from '@octokit/plugin-paginate-rest';

const MyOctokit = Octokit.plugin(restEndpointMethods, paginateRest);

if (!process.env.GITHUB_TOKEN) {
	throw new Error('GITHUB_TOKEN environment variable not detected');
}

export default new MyOctokit({auth: process.env.GITHUB_TOKEN});
