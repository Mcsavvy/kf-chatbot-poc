.ONESHELL:
revision=-1

.PHONY: help
help:		## Show this help message.
	@echo "Usage: make <target>"
	@echo "\nTargets:\n========"
	@fgrep "##" Makefile | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##/ -/'


.PHONY: run
run:		## Run the fastapi app.
	poetry run uvicorn app.main:app --reload

.PHONY: shell
shell:		## Run the ipython shell.
	poetry run ipython

.PHONY: db-upgrade
db-upgrade:	## Upgrade the database.
	poetry run alembic upgrade head

.PHONY: db-downgrade
db-downgrade:	## Downgrade the database.
	poetry run alembic downgrade $(revision)

.PHONY: db-revision
db-revision:	## Create a new database revision.
	poetry run alembic revision --autogenerate -m '$(message)'