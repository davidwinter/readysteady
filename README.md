# readysteady

[![test](https://github.com/davidwinter/readysteady/actions/workflows/test.yml/badge.svg)](https://github.com/davidwinter/readysteady/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/readysteady)](https://www.npmjs.com/package/readysteady) [![npm](https://img.shields.io/npm/dw/readysteady)](https://www.npmjs.com/package/readysteady)

> A simple way to upload your assets and prepare a new draft release on GitHub

![screenshot](https://raw.githubusercontent.com/davidwinter/readysteady/main/screenshot.gif)

What **readysteady** does is quite simple:

1. Checks that a release for the specified tag doesn't already exist
2. Checks if you want to delete an existing draft release for a tagged version and replace with a new one
3. Create a draft GitHub release with the name being the same as the tag, except for the `v` prefix
4. Upload the corresponding file assets

To authenticate with GitHub, it depends on a `GITHUB_TOKEN` environment variable.

**Why?** Interacting directly with the GitHub API, or using one of the many API clients, involves using multiple calls and checks to achieve what should be quite a simple task. `readysteady` wraps this all up into a self-contained command with a friendly UX that works great directly on your desktop or within CI.

## Install

```sh
$ npm install --global readysteady
```

## Example usage

```sh
export GITHUB_TOKEN=xyz123

readysteady \
	--owner=davidwinter \
	--repo=readysteady \
	--tag=v1.0.0 \
	--files=latest.yml \
	--files=readysteady.dmg \
	--force
```

The `--force` flag is used to delete any existing draft release and replace it with a new one.

# License

MIT &copy; 2021 David Winter
