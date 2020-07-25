SHELL=/bin/bash

%:
	@:

args = `arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

# examples:
# $ make test
# $ make test test/unit
# $ make test test/unit/specific/file.js
# $ make test test/unit -- --with-errors
# $ make test test/unit -- --keep-alive
test:
	@mocha-headless $(call args)

coverage:
	@make test -- --coverage

.PHONY: test coverage