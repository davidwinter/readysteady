.PHONY: setup lint test

setup:
	npm install

lint:
	npm exec xo

test:
	npm exec ava
