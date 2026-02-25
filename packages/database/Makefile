# ========================================
# Agora Database Makefile
# ========================================

.PHONY: help install up down migrate seed reset studio backup restore test clean logs

# Default target
help:
	@echo "Agora Database Management"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make install        Install dependencies"
	@echo "  make up             Start Docker services"
	@echo "  make up-all         Start with PgAdmin"
	@echo "  make down           Stop Docker services"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate        Run migrations"
	@echo "  make migrate-dev    Create new migration (dev)"
	@echo "  make seed           Seed database"
	@echo "  make reset          Reset database (⚠️ destructive)"
	@echo "  make studio         Open Prisma Studio"
	@echo ""
	@echo "Backup Commands:"
	@echo "  make backup         Create backup"
	@echo "  make backup-list    List backups"
	@echo "  make restore        Restore from backup"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make test           Test database connections"
	@echo "  make logs           View service logs"
	@echo "  make clean          Remove volumes and reset"
	@echo "  make generate       Generate Prisma client"

# Installation
install:
	npm install
	npx prisma generate

# Docker Commands
up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@make test

up-all:
	docker-compose --profile pgadmin up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@make test

down:
	docker-compose down

# Database Operations
migrate:
	npx prisma migrate deploy

migrate-dev:
	npx prisma migrate dev

seed:
	npx prisma db seed

reset:
	@echo "⚠️  This will reset the database. Are you sure? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		npx prisma migrate reset --force; \
	else \
		echo "Cancelled"; \
	fi

studio:
	npx prisma studio

# Backup Operations
backup:
	./scripts/backup.sh

backup-list:
	./scripts/restore.sh -l

restore:
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make restore BACKUP=agora_backup_YYYYMMDD_HHMMSS"; \
		echo "Run 'make backup-list' to see available backups"; \
		exit 1; \
	fi
	./scripts/restore.sh $(BACKUP)

# Utility
generate:
	npx prisma generate

test:
	./scripts/test-connection.sh

test-db:
	@PGPASSWORD=agora_secret psql postgresql://agora:agora_secret@localhost:5432/agora -c "SELECT version();" > /dev/null 2>&1 && echo "✓ PostgreSQL (port 5432)" || echo "✗ PostgreSQL (port 5432)"
	@PGPASSWORD=agora_secret psql postgresql://agora:agora_secret@localhost:6432/agora -c "SELECT version();" > /dev/null 2>&1 && echo "✓ PgBouncer (port 6432)" || echo "✗ PgBouncer (port 6432)"
	@PGPASSWORD=agora_secret psql postgresql://agora:agora_secret@localhost:5433/agora -c "SELECT version();" > /dev/null 2>&1 && echo "✓ PostgreSQL Replica (port 5433)" || echo "✗ PostgreSQL Replica (port 5433)"
	@redis-cli -h localhost -p 6379 ping > /dev/null 2>&1 && echo "✓ Redis (port 6379)" || echo "✗ Redis (port 6379)"

logs:
	docker-compose logs -f

clean:
	@echo "⚠️  This will remove all Docker volumes and data. Are you sure? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		docker-compose down -v; \
		rm -rf backups/*.dump backups/*_manifest.json; \
		echo "Cleanup complete"; \
	else \
		echo "Cancelled"; \
	fi

# Development workflow
dev-setup: install up migrate seed
	@echo "✅ Development environment ready!"
	@echo ""
	@echo "Services:"
	@echo "  PostgreSQL:    localhost:5432"
	@echo "  PgBouncer:     localhost:6432"
	@echo "  Redis:         localhost:6379"
	@echo "  PgAdmin:       http://localhost:5050 (if enabled)"
	@echo ""
	@echo "Useful commands:"
	@echo "  make studio     - Open database UI"
	@echo "  make migrate    - Run migrations"
	@echo "  make seed       - Seed test data"

# CI/CD commands
ci-migrate:
	npx prisma migrate deploy

ci-generate:
	npx prisma generate

ci-check:
	npx prisma validate
	npx prisma format --check
