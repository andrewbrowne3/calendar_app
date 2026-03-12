"""
Finance SQL tool functions.
Direct PostgreSQL queries for reliable financial data.
Supports SELECT, INSERT, and UPDATE — DELETE/DROP/TRUNCATE are blocked.
"""

import json
import os
import re
import uuid
from datetime import datetime, date
from decimal import Decimal

import psycopg2
import psycopg2.extras

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "db"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "calendar"),
    "user": os.getenv("DB_USER", "calendar_user"),
    "password": os.getenv("DB_PASSWORD", "calendar_pass"),
}

DEFAULT_EMAIL = "andrewbrowne161@gmail.com"

# Hard-blocked SQL operations — checked against the statement keyword, not string values
_BLOCKED_KEYWORDS = {'DELETE', 'DROP', 'TRUNCATE'}


def _check_sql(sql: str):
    """Raise if the SQL statement starts with a blocked operation."""
    # Strip leading whitespace and grab the first keyword
    first_word = sql.strip().split()[0].upper() if sql.strip() else ''
    if first_word in _BLOCKED_KEYWORDS:
        raise PermissionError(
            f"Blocked: {first_word} queries are not allowed. Only SELECT, INSERT, and UPDATE permitted."
        )


def _get_conn():
    return psycopg2.connect(**DB_CONFIG)


def _json_serial(obj):
    """JSON serializer for types not handled by default."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def _query(sql: str, params: tuple = ()) -> list[dict]:
    """Execute a read query and return rows as dicts."""
    _check_sql(sql)
    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def _execute(sql: str, params: tuple = (), returning: bool = False) -> list[dict] | None:
    """Execute a write query (INSERT/UPDATE). Commits automatically."""
    _check_sql(sql)
    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            result = None
            if returning:
                result = [dict(row) for row in cur.fetchall()]
            conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _get_user_id(email: str = None) -> str:
    """Look up user ID by email."""
    email = email or DEFAULT_EMAIL
    rows = _query(
        "SELECT id FROM authentication_user WHERE email = %s", (email,)
    )
    if not rows:
        raise ValueError(f"User not found: {email}")
    return str(rows[0]["id"])


def _recalculate_balance(account_id: str):
    """Recalculate and update an account's current_balance from transactions."""
    _execute(
        """
        UPDATE finance_account SET
            current_balance = initial_balance
                + COALESCE((SELECT SUM(CASE
                    WHEN t.transaction_type = 'income' THEN t.amount
                    WHEN t.transaction_type = 'expense' THEN -t.amount
                    WHEN t.transaction_type = 'transfer' THEN -t.amount
                    ELSE 0 END)
                  FROM finance_transaction t
                  WHERE t.account_id = finance_account.id
                    AND t.is_active = true AND t.status != 'void'), 0)
                + COALESCE((SELECT SUM(t.amount)
                  FROM finance_transaction t
                  WHERE t.transfer_to_account_id = finance_account.id
                    AND t.is_active = true AND t.status != 'void'), 0),
            updated_at = NOW()
        WHERE id = %s
        """,
        (account_id,),
    )


# ── Read Tools ────────────────────────────────────────────────────────


def get_accounts(token: str = None) -> str:
    """Retrieve user's financial accounts with current balances."""
    try:
        user_id = _get_user_id()
        rows = _query(
            """
            SELECT
                a.id, a.name, a.account_type, a.currency,
                a.initial_balance,
                a.initial_balance + COALESCE(
                    (SELECT SUM(CASE
                        WHEN t.transaction_type = 'income' THEN t.amount
                        WHEN t.transaction_type = 'expense' THEN -t.amount
                        WHEN t.transaction_type = 'transfer' AND t.account_id = a.id THEN -t.amount
                        ELSE 0
                    END)
                    FROM finance_transaction t
                    WHERE t.account_id = a.id AND t.is_active = true AND t.status != 'void'),
                0) +
                COALESCE(
                    (SELECT SUM(t.amount)
                    FROM finance_transaction t
                    WHERE t.transfer_to_account_id = a.id AND t.is_active = true AND t.status != 'void'),
                0) AS current_balance,
                a.description, a.color, a.icon
            FROM finance_account a
            WHERE a.owner_id = %s
            ORDER BY a.account_type, a.name
            """,
            (user_id,),
        )
        return json.dumps(rows, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get accounts failed - {e}"


def get_transactions(
    token: str = None,
    account_id: str = None,
    start_date: str = None,
    end_date: str = None,
    transaction_type: str = None,
    category_id: str = None,
) -> str:
    """Retrieve transactions with optional filters."""
    try:
        user_id = _get_user_id()
        conditions = ["t.is_active = true", "a.owner_id = %s"]
        params: list = [user_id]

        if account_id:
            conditions.append("t.account_id = %s")
            params.append(account_id)
        if start_date:
            conditions.append("t.date >= %s")
            params.append(start_date)
        if end_date:
            conditions.append("t.date <= %s")
            params.append(end_date)
        if transaction_type:
            conditions.append("t.transaction_type = %s")
            params.append(transaction_type)
        if category_id:
            conditions.append("t.category_id = %s")
            params.append(category_id)

        where = " AND ".join(conditions)
        rows = _query(
            f"""
            SELECT
                t.id, t.transaction_type, t.amount, t.description,
                t.date, t.notes, t.status,
                c.name AS category_name, c.category_type AS category_type,
                a.name AS account_name, a.id AS account_id
            FROM finance_transaction t
            JOIN finance_account a ON t.account_id = a.id
            LEFT JOIN finance_category c ON t.category_id = c.id
            WHERE {where}
            ORDER BY t.date DESC, t.created_at DESC
            LIMIT 200
            """,
            tuple(params),
        )
        return json.dumps(rows, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get transactions failed - {e}"


def get_financial_dashboard(token: str = None) -> str:
    """Get financial dashboard: balances, monthly income/expenses, recent transactions."""
    try:
        user_id = _get_user_id()

        accounts = _query(
            """
            SELECT
                a.id, a.name, a.account_type,
                a.initial_balance + COALESCE(
                    (SELECT SUM(CASE
                        WHEN t.transaction_type = 'income' THEN t.amount
                        WHEN t.transaction_type = 'expense' THEN -t.amount
                        WHEN t.transaction_type = 'transfer' AND t.account_id = a.id THEN -t.amount
                        ELSE 0
                    END)
                    FROM finance_transaction t
                    WHERE t.account_id = a.id AND t.is_active = true AND t.status != 'void'),
                0) +
                COALESCE(
                    (SELECT SUM(t.amount)
                    FROM finance_transaction t
                    WHERE t.transfer_to_account_id = a.id AND t.is_active = true AND t.status != 'void'),
                0) AS current_balance
            FROM finance_account a
            WHERE a.owner_id = %s
            ORDER BY a.account_type, a.name
            """,
            (user_id,),
        )

        monthly = _query(
            """
            SELECT
                COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) AS monthly_income,
                COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) AS monthly_expenses
            FROM finance_transaction t
            JOIN finance_account a ON t.account_id = a.id
            WHERE a.owner_id = %s
              AND t.is_active = true AND t.status != 'void'
              AND t.date >= date_trunc('month', CURRENT_DATE)
              AND t.date < date_trunc('month', CURRENT_DATE) + interval '1 month'
            """,
            (user_id,),
        )

        recent = _query(
            """
            SELECT
                t.id, t.transaction_type, t.amount, t.description,
                t.date, c.name AS category_name, a.name AS account_name
            FROM finance_transaction t
            JOIN finance_account a ON t.account_id = a.id
            LEFT JOIN finance_category c ON t.category_id = c.id
            WHERE a.owner_id = %s AND t.is_active = true AND t.status != 'void'
            ORDER BY t.date DESC, t.created_at DESC
            LIMIT 10
            """,
            (user_id,),
        )

        budgets = _query(
            """
            SELECT
                b.id, b.amount AS budget_amount, b.period,
                c.name AS category_name,
                a.name AS account_name,
                COALESCE(
                    (SELECT SUM(t.amount)
                     FROM finance_transaction t
                     WHERE t.category_id = b.category_id
                       AND t.transaction_type = 'expense'
                       AND t.is_active = true AND t.status != 'void'
                       AND t.date >= CASE b.period
                           WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)
                           WHEN 'weekly' THEN date_trunc('week', CURRENT_DATE)
                           WHEN 'yearly' THEN date_trunc('year', CURRENT_DATE)
                           WHEN 'quarterly' THEN date_trunc('quarter', CURRENT_DATE)
                       END
                       AND (b.account_id IS NULL OR t.account_id = b.account_id)
                    ), 0
                ) AS spent
            FROM finance_budget b
            JOIN finance_category c ON b.category_id = c.id
            LEFT JOIN finance_account a ON b.account_id = a.id
            WHERE b.user_id = %s AND b.is_active = true
            """,
            (user_id,),
        )

        budget_alerts = []
        for b in budgets:
            pct = (float(b["spent"]) / float(b["budget_amount"]) * 100) if float(b["budget_amount"]) > 0 else 0
            if pct >= 80:
                budget_alerts.append({
                    "category": b["category_name"],
                    "budget": float(b["budget_amount"]),
                    "spent": float(b["spent"]),
                    "percentage": round(pct, 1),
                })

        dashboard = {
            "accounts": accounts,
            "monthly_income": float(monthly[0]["monthly_income"]) if monthly else 0,
            "monthly_expenses": float(monthly[0]["monthly_expenses"]) if monthly else 0,
            "recent_transactions": recent,
            "budget_alerts": budget_alerts,
        }
        return json.dumps(dashboard, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get dashboard failed - {e}"


def get_profit_loss(
    token: str = None,
    account_id: str = None,
    start_date: str = None,
    end_date: str = None,
) -> str:
    """Get profit & loss report with category breakdown."""
    try:
        user_id = _get_user_id()
        conditions = ["a.owner_id = %s", "t.is_active = true", "t.status != 'void'"]
        params: list = [user_id]

        if account_id:
            conditions.append("t.account_id = %s")
            params.append(account_id)
        if start_date:
            conditions.append("t.date >= %s")
            params.append(start_date)
        if end_date:
            conditions.append("t.date <= %s")
            params.append(end_date)

        where = " AND ".join(conditions)

        income = _query(
            f"""
            SELECT c.name AS category, COALESCE(SUM(t.amount), 0) AS total
            FROM finance_transaction t
            JOIN finance_account a ON t.account_id = a.id
            LEFT JOIN finance_category c ON t.category_id = c.id
            WHERE {where} AND t.transaction_type = 'income'
            GROUP BY c.name
            ORDER BY total DESC
            """,
            tuple(params),
        )

        expenses = _query(
            f"""
            SELECT c.name AS category, COALESCE(SUM(t.amount), 0) AS total
            FROM finance_transaction t
            JOIN finance_account a ON t.account_id = a.id
            LEFT JOIN finance_category c ON t.category_id = c.id
            WHERE {where} AND t.transaction_type = 'expense'
            GROUP BY c.name
            ORDER BY total DESC
            """,
            tuple(params),
        )

        total_income = sum(float(r["total"]) for r in income)
        total_expenses = sum(float(r["total"]) for r in expenses)

        report = {
            "period": {"start_date": start_date, "end_date": end_date},
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_profit": total_income - total_expenses,
            "income_by_category": income,
            "expenses_by_category": expenses,
        }
        return json.dumps(report, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get P&L failed - {e}"


def get_budget_status(token: str = None) -> str:
    """Get current budget utilization status."""
    try:
        user_id = _get_user_id()
        budgets = _query(
            """
            SELECT
                b.id, b.amount AS budget_amount, b.period,
                c.name AS category_name,
                a.name AS account_name,
                COALESCE(
                    (SELECT SUM(t.amount)
                     FROM finance_transaction t
                     WHERE t.category_id = b.category_id
                       AND t.transaction_type = 'expense'
                       AND t.is_active = true AND t.status != 'void'
                       AND t.date >= CASE b.period
                           WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)
                           WHEN 'weekly' THEN date_trunc('week', CURRENT_DATE)
                           WHEN 'yearly' THEN date_trunc('year', CURRENT_DATE)
                           WHEN 'quarterly' THEN date_trunc('quarter', CURRENT_DATE)
                       END
                       AND (b.account_id IS NULL OR t.account_id = b.account_id)
                    ), 0
                ) AS spent
            FROM finance_budget b
            JOIN finance_category c ON b.category_id = c.id
            LEFT JOIN finance_account a ON b.account_id = a.id
            WHERE b.user_id = %s AND b.is_active = true
            """,
            (user_id,),
        )

        result = []
        for b in budgets:
            budget_amt = float(b["budget_amount"])
            spent = float(b["spent"])
            result.append({
                "category": b["category_name"],
                "account": b["account_name"],
                "period": b["period"],
                "budget": budget_amt,
                "spent": spent,
                "remaining": budget_amt - spent,
                "percentage_used": round(spent / budget_amt * 100, 1) if budget_amt > 0 else 0,
            })
        return json.dumps(result, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get budget status failed - {e}"


def get_categories(token: str = None) -> str:
    """Get available financial categories."""
    try:
        user_id = _get_user_id()
        rows = _query(
            """
            SELECT id, name, category_type, is_tax_deductible, tax_category, icon, color
            FROM finance_category
            WHERE user_id = %s OR user_id IS NULL
            ORDER BY category_type, name
            """,
            (user_id,),
        )
        return json.dumps(rows, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get categories failed - {e}"


def get_tax_summary(token: str = None, year: str = None) -> str:
    """Get tax-deductible expense summary for a year."""
    try:
        user_id = _get_user_id()
        year = year or str(date.today().year)
        rows = _query(
            """
            SELECT
                COALESCE(t.tax_category, c.tax_category, 'other') AS tax_category,
                c.name AS category_name,
                SUM(t.amount) AS total
            FROM finance_transaction t
            JOIN finance_account a ON t.account_id = a.id
            LEFT JOIN finance_category c ON t.category_id = c.id
            WHERE a.owner_id = %s
              AND t.is_active = true AND t.status != 'void'
              AND t.transaction_type = 'expense'
              AND (t.is_tax_deductible = true OR c.is_tax_deductible = true)
              AND EXTRACT(YEAR FROM t.date) = %s
            GROUP BY COALESCE(t.tax_category, c.tax_category, 'other'), c.name
            ORDER BY total DESC
            """,
            (user_id, int(year)),
        )

        total_deductible = sum(float(r["total"]) for r in rows)
        return json.dumps({
            "year": year,
            "total_deductible": total_deductible,
            "by_category": rows,
        }, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Get tax summary failed - {e}"


# ── Write Tools ───────────────────────────────────────────────────────


def create_transaction(
    token: str = None,
    account_id: str = None,
    transaction_type: str = None,
    amount: str = None,
    description: str = None,
    date_str: str = None,
    category_id: str = None,
    notes: str = None,
) -> str:
    """Create a new financial transaction via direct SQL INSERT."""
    try:
        user_id = _get_user_id()
        txn_date = date_str or date.today().isoformat()
        txn_id = str(uuid.uuid4())

        # Look up tax fields from category if provided
        is_tax_deductible = False
        tax_category = None
        if category_id:
            cat_rows = _query(
                "SELECT is_tax_deductible, tax_category FROM finance_category WHERE id = %s",
                (category_id,),
            )
            if cat_rows:
                is_tax_deductible = cat_rows[0]["is_tax_deductible"]
                tax_category = cat_rows[0]["tax_category"]

        rows = _execute(
            """
            INSERT INTO finance_transaction
                (id, account_id, created_by_id, transaction_type, amount,
                 description, notes, date, status, is_active,
                 is_tax_deductible, tax_category, tags,
                 created_at, updated_at)
            VALUES
                (%s, %s, %s, %s, %s,
                 %s, %s, %s, 'cleared', true,
                 %s, %s, '[]'::jsonb,
                 NOW(), NOW())
            RETURNING id, account_id, transaction_type, amount, description, date, status
            """,
            (
                txn_id, account_id, user_id, transaction_type, amount,
                description, notes or '', txn_date,
                is_tax_deductible, tax_category,
            ),
            returning=True,
        )

        _recalculate_balance(account_id)

        return json.dumps({
            "message": "Transaction created successfully",
            "transaction": rows[0] if rows else {"id": txn_id},
        }, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Create transaction failed - {e}"


def create_transfer(
    token: str = None,
    from_account_id: str = None,
    to_account_id: str = None,
    amount: str = None,
    description: str = None,
    date_str: str = None,
) -> str:
    """Transfer money between accounts via direct SQL INSERTs."""
    try:
        user_id = _get_user_id()
        txn_date = date_str or date.today().isoformat()
        outgoing_id = str(uuid.uuid4())
        incoming_id = str(uuid.uuid4())

        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Create outgoing transaction
                cur.execute(
                    """
                    INSERT INTO finance_transaction
                        (id, account_id, created_by_id, transaction_type, amount,
                         description, notes, date, status, is_active,
                         transfer_to_account_id, tags,
                         is_tax_deductible, created_at, updated_at)
                    VALUES
                        (%s, %s, %s, 'transfer', %s,
                         %s, '', %s, 'cleared', true,
                         %s, '[]'::jsonb,
                         false, NOW(), NOW())
                    """,
                    (outgoing_id, from_account_id, user_id, amount,
                     description, txn_date, to_account_id),
                )

                # Create incoming transaction
                cur.execute(
                    """
                    INSERT INTO finance_transaction
                        (id, account_id, created_by_id, transaction_type, amount,
                         description, notes, date, status, is_active,
                         transfer_to_account_id, tags,
                         is_tax_deductible, created_at, updated_at)
                    VALUES
                        (%s, %s, %s, 'transfer', %s,
                         %s, '', %s, 'cleared', true,
                         %s, '[]'::jsonb,
                         false, NOW(), NOW())
                    """,
                    (incoming_id, to_account_id, user_id, amount,
                     description, txn_date, from_account_id),
                )

                # Link paired transactions
                cur.execute(
                    "UPDATE finance_transaction SET transfer_transaction_id = %s WHERE id = %s",
                    (incoming_id, outgoing_id),
                )
                cur.execute(
                    "UPDATE finance_transaction SET transfer_transaction_id = %s WHERE id = %s",
                    (outgoing_id, incoming_id),
                )

                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        _recalculate_balance(from_account_id)
        _recalculate_balance(to_account_id)

        return json.dumps({
            "message": "Transfer completed successfully",
            "outgoing_id": outgoing_id,
            "incoming_id": incoming_id,
            "amount": amount,
            "from_account": from_account_id,
            "to_account": to_account_id,
        }, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Create transfer failed - {e}"


def create_category(
    token: str = None,
    name: str = None,
    category_type: str = None,
    is_tax_deductible: bool = False,
    tax_category: str = None,
    color: str = '#9E9E9E',
    icon: str = None,
) -> str:
    """Create a new financial category."""
    try:
        user_id = _get_user_id()
        cat_id = str(uuid.uuid4())

        rows = _execute(
            """
            INSERT INTO finance_category
                (id, user_id, name, category_type, is_tax_deductible,
                 tax_category, color, icon, created_at, updated_at)
            VALUES
                (%s, %s, %s, %s, %s,
                 %s, %s, %s, NOW(), NOW())
            RETURNING id, name, category_type
            """,
            (
                cat_id, user_id, name, category_type, is_tax_deductible,
                tax_category, color, icon,
            ),
            returning=True,
        )

        return json.dumps({
            "message": "Category created successfully",
            "category": rows[0] if rows else {"id": cat_id, "name": name},
        }, indent=2, default=_json_serial)
    except Exception as e:
        return f"ERROR: Create category failed - {e}"


# ── Registry ──────────────────────────────────────────────────────────

FINANCE_SQL_TOOL_REGISTRY = {
    # Reads
    "get_accounts": get_accounts,
    "get_transactions": get_transactions,
    "get_financial_dashboard": get_financial_dashboard,
    "get_profit_loss": get_profit_loss,
    "get_budget_status": get_budget_status,
    "get_categories": get_categories,
    "get_tax_summary": get_tax_summary,
    # Writes
    "create_transaction": create_transaction,
    "create_transfer": create_transfer,
    "create_category": create_category,
}
