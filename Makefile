.PHONY: install dev test lint run docker
install:
	python -m pip install -r requirements.txt
dev:
	python -m pip install -r requirements-dev.txt
test:
	python -m pytest tests -q
lint:
	ruff check cyberguard tests scripts app.py
run:
	python app.py
docker:
	docker compose up --build
