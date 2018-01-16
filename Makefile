ESY_EXT := $(shell command -v esy 2> /dev/null)

RELEASE_TAG ?= latest
BIN = $(PWD)/node_modules/.bin

#
# Tools
#

.DEFAULT: help

define HELP

 Common tasks:

   clean               Clean build artefacts

 Release tasks:

   publish             Build release and run 'npm publish'
   build-release       Produce an npm package ready to be published (useful for debug)

   bump-major-version  Bump major package version (commits & tags)
   bump-minor-version  Bump minor package version (commits & tags)
   bump-patch-version  Bump patch package version (commits & tags)

endef
export HELP

help:
	@echo "$$HELP"

ifndef ESY_EXT
	$(error "esy command is not avaialble, run 'npm install -g esy'")
endif
	@make -C esy-build-package install build
	@yarn

doctoc:
	@$(BIN)/doctoc --notitle ./README.md

clean:
	@rm -rf lib/

ci:
	$(MAKE) build-release

#
# Release
#

RELEASE_ROOT = dist
RELEASE_FILES = \
	index.js \
	package.json

build-release:
	@rm -rf $(RELEASE_ROOT)
	@$(MAKE) -j $(RELEASE_FILES:%=$(RELEASE_ROOT)/%)
	@cp -rf stubs $(RELEASE_ROOT)

$(RELEASE_ROOT)/index.js:
	@node ./scripts/build-webpack.js ./create-project.js $(@)

$(RELEASE_ROOT)/%: $(PWD)/%
	@mkdir -p $(@D)
	@cp $(<) $(@)

publish: build-release
	@(cd $(RELEASE_ROOT) && npm publish --access public --tag $(RELEASE_TAG))
	@git push && git push --tags

bump-major-version:
	@npm version major

bump-minor-version:
	@npm version minor

bump-patch-version:
	@npm version patch
