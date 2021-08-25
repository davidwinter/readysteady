# readysteady

[![test](https://github.com/davidwinter/readysteady/actions/workflows/test.yml/badge.svg)](https://github.com/davidwinter/readysteady/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/readysteady)](https://www.npmjs.com/package/readysteady) [![npm](https://img.shields.io/npm/dw/readysteady)](https://www.npmjs.com/package/readysteady)

> A simple way to upload your assets and prepare a new draft release on GitHub

Interacting directly with the GitHub API, or using one of the many API clients, involves using multiple calls and checks to achieve what should be quite a simple task. `readysteady` wraps this all up into a self-contained binary with a friendly UX that works great directly on your desktop or within CI.

```js
import readySteady from 'readysteady';

const newDraftRelease = await readySteady({
    owner: 'davidwinter',
    repo: 'readysteady',
    tag: 'v1.0.0',
    files: ['README.md', 'readysteady.dmg'],
});
```

What **readysteady** does is quite simple:

1. Checks that a release for the specified tag doesn't already exist
2. Checks if you want to delete an existing draft release for a tagged version and replace with a new one
3. Create a draft GitHub release with the name being the same as the tag, except for the `v` prefix
4. Upload the corresponding assets

This workflow is great if you want to manually publish a release when you are ready to **GO!**

To authenticate with GitHub, it depends on a `GITHUB_TOKEN` environment variable, which you can prefix ahead of running your script:

# License

MIT &copy; 2021 David Winter
