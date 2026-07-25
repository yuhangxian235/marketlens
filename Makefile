.PHONY: help bootstrap contract-test analytics-test test abi demo

help:
	@echo "bootstrap       Install/pin project dependencies"
	@echo "contract-test   Run Foundry tests"
	@echo "analytics-test  Run Python tests"
	@echo "test            Run contract and analytics tests"
	@echo "abi             Regenerate the typed contract ABI"
	@echo "demo            Run the local fork demo through PowerShell"

bootstrap:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/bootstrap.ps1

contract-test:
	cd contracts && forge test

analytics-test:
	uv run --project analytics pytest -q

test: contract-test analytics-test

abi:
	cd contracts && forge build
	node scripts/generate-abi.mjs

demo:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/demo.ps1
