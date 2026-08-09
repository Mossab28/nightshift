# Nightshift -- the on-call data team that gets smarter every night.
#
# `make demo` is the whole story: a DataHub with a realistic enterprise graph,
# a silently broken pipeline, and an agent shift that repairs it and remembers.

.PHONY: setup up datapack break oncall restore report demo clean

setup:            ## install the package and its CLI
	uv venv && uv pip install -e .

up:               ## start DataHub locally (Docker, ~8GB RAM)
	datahub docker quickstart

datapack:         ## load the showcase e-commerce graph (1049 entities)
	datahub datapack load showcase-ecommerce

break:            ## silently rename an upstream column; tell nobody
	.venv/bin/nightshift break

oncall:           ## hand the pager to the agents for one shift
	.venv/bin/nightshift oncall

restore:          ## put the schema back so the demo can run again
	.venv/bin/nightshift restore

report:           ## print the latest morning report
	.venv/bin/nightshift report

demo: break oncall report  ## the full incident, end to end

clean:            ## stop DataHub and remove its containers
	datahub docker nuke
