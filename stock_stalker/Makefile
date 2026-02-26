.PHONY: help install test lint build run docker-build docker-run clean

# 默认目标
help:
	@echo "Stock Stalker - Available Commands:"
	@echo ""
	@echo "  make install       - Install dependencies"
	@echo "  make test          - Run all tests"
	@echo "  make lint          - Run linter"
	@echo "  make run           - Run main application"
	@echo "  make cli           - Run CLI interface"
	@echo "  make dashboard     - Show dashboard"
	@echo ""
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-run    - Run with Docker Compose"
	@echo "  make docker-stop   - Stop Docker containers"
	@echo ""
	@echo "  make scan T=AAPL   - Scan ticker (example: make scan T=TSLA)"
	@echo "  make backtest T=AAPL - Run backtest"
	@echo ""
	@echo "  make clean         - Clean generated files"
	@echo "  make backup        - Backup database"

# 安装依赖
install:
	pip3 install -r requirements.txt

# 运行测试
test:
	python3 run_tests.py

# 代码检查
lint:
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

# 运行主程序
run:
	python3 main.py

# 运行CLI
cli:
	python3 cli.py dashboard

dashboard:
	python3 cli.py dashboard

# Docker操作
docker-build:
	docker build -t stock-stalker:latest .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

docker-logs:
	docker-compose logs -f stock-stalker

# 快捷命令
scan:
	@if [ -z "$(T)" ]; then \
		echo "Usage: make scan T=AAPL"; \
		exit 1; \
	fi
	python3 cli.py scan $(T)

backtest:
	@if [ -z "$(T)" ]; then \
		echo "Usage: make backtest T=AAPL"; \
		exit 1; \
	fi
	python3 cli.py backtest $(T)

tech:
	@if [ -z "$(T)" ]; then \
		echo "Usage: make tech T=AAPL"; \
		exit 1; \
	fi
	python3 cli.py tech $(T)

# 清理
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
	rm -f *.json
	rm -rf htmlcov

# 备份数据库
backup:
	@mkdir -p backups
	@cp data/stock_stalker.db backups/stock_stalker_$(shell date +%Y%m%d_%H%M%S).db
	@echo "✅ Database backed up to backups/"

# 查看状态
status:
	@echo "📊 Stock Stalker Status"
	@echo "======================="
	@python3 -c "from data.storage.database import Database; db = Database(); print(f'Database: Connected')"
	@python3 -c "from core.watchlist_scanner import WatchlistScanner; s = WatchlistScanner(); print(f'Watchlist: {len(s.items)} items')"
