.PHONY: setup lint test

setup:
	npm install

lint:
	npx xo

test:
	npx ava
