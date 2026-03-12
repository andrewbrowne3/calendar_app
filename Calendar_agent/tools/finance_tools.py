"""
Finance API tool functions.
Each function corresponds to a tool the agent can call via THINK/ACT/OBSERVE.
"""

import json

import requests

CALENDAR_API_BASE = "https://calendar.andrewbrowne.org"


def _auth_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def get_accounts(token: str) -> str:
    """Retrieve user's financial accounts."""
    try:
        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/accounts/",
            headers=_auth_headers(token),
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get accounts failed - {e}"


def get_transactions(
    token: str,
    account_id: str = None,
    start_date: str = None,
    end_date: str = None,
    transaction_type: str = None,
    category_id: str = None,
) -> str:
    """Retrieve transactions with optional filters."""
    try:
        params = {}
        if account_id:
            params["account_id"] = account_id
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if transaction_type:
            params["transaction_type"] = transaction_type
        if category_id:
            params["category_id"] = category_id

        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/transactions/",
            headers=_auth_headers(token),
            params=params,
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get transactions failed - {e}"


def create_transaction(
    token: str,
    account_id: str,
    transaction_type: str,
    amount: str,
    description: str,
    date: str = None,
    category_id: str = None,
    notes: str = None,
) -> str:
    """Create a new financial transaction."""
    try:
        from datetime import datetime as dt

        data = {
            "account": account_id,
            "transaction_type": transaction_type,
            "amount": amount,
            "description": description,
            "date": date or dt.now().strftime("%Y-%m-%d"),
        }
        if category_id:
            data["category"] = category_id
        if notes:
            data["notes"] = notes

        result = requests.post(
            f"{CALENDAR_API_BASE}/api/finance/transactions/",
            json=data,
            headers=_auth_headers(token),
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Create transaction failed - {e}"


def create_transfer(
    token: str,
    from_account_id: str,
    to_account_id: str,
    amount: str,
    description: str,
    date: str = None,
) -> str:
    """Transfer money between accounts."""
    try:
        from datetime import datetime as dt

        data = {
            "from_account": from_account_id,
            "to_account": to_account_id,
            "amount": amount,
            "description": description,
            "date": date or dt.now().strftime("%Y-%m-%d"),
        }
        result = requests.post(
            f"{CALENDAR_API_BASE}/api/finance/transfers/",
            json=data,
            headers=_auth_headers(token),
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Create transfer failed - {e}"


def get_financial_dashboard(token: str) -> str:
    """Get financial dashboard summary with balances, income, expenses, and alerts."""
    try:
        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/dashboard/",
            headers=_auth_headers(token),
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get dashboard failed - {e}"


def get_profit_loss(
    token: str,
    account_id: str = None,
    start_date: str = None,
    end_date: str = None,
) -> str:
    """Get profit & loss report."""
    try:
        params = {}
        if account_id:
            params["account_id"] = account_id
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date

        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/reports/profit-loss/",
            headers=_auth_headers(token),
            params=params,
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get P&L failed - {e}"


def get_budget_status(token: str) -> str:
    """Get current budget utilization status."""
    try:
        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/reports/budget-status/",
            headers=_auth_headers(token),
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get budget status failed - {e}"


def get_categories(token: str) -> str:
    """Get available financial categories."""
    try:
        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/categories/",
            headers=_auth_headers(token),
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get categories failed - {e}"


def get_tax_summary(token: str, year: str = None) -> str:
    """Get tax-deductible expense summary for a year."""
    try:
        params = {}
        if year:
            params["year"] = year
        result = requests.get(
            f"{CALENDAR_API_BASE}/api/finance/reports/tax-summary/",
            headers=_auth_headers(token),
            params=params,
        )
        result.raise_for_status()
        return json.dumps(result.json(), indent=2)
    except requests.exceptions.RequestException as e:
        return f"ERROR: Get tax summary failed - {e}"


FINANCE_TOOL_REGISTRY = {
    "get_accounts": get_accounts,
    "get_transactions": get_transactions,
    "create_transaction": create_transaction,
    "create_transfer": create_transfer,
    "get_financial_dashboard": get_financial_dashboard,
    "get_profit_loss": get_profit_loss,
    "get_budget_status": get_budget_status,
    "get_categories": get_categories,
    "get_tax_summary": get_tax_summary,
}
