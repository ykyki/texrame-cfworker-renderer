.DEFAULT_GOAL := help

.PHONY: help
help:
	@cat $(firstword $(MAKEFILE_LIST))

.PHONY: all
all: vendor/tex-svg.txt

vendor/tex-svg.txt: node_modules/mathjax/es5/tex-svg.js
	mkdir -p $(dir $@)
	cp $< $@