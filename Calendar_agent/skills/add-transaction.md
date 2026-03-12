# Skill: Add Transaction

**Keywords:** expense, income, spent, earned, paid, bought, charge, cost, payment, revenue, salary, purchase, transaction
**Inputs:** User message with transaction details (amount, description, account, category, date)
**Output:** Confirmation that the transaction was recorded
**When to use:** User wants to record a new income or expense transaction

## Procedure:

1. Call `login()` to authenticate (needed for creating transactions)
2. Call `get_accounts(token='none')` to find the right account_id (uses direct SQL, no auth needed)
3. If the user mentions a category, call `get_categories(token='none')` to resolve category_id. If no matching category exists, call `create_category(token='none', name='Category Name', category_type='expense')` to create it first, then use the returned id as category_id.
4. Parse transaction details from the user's message:
   - **transaction_type**: "income" or "expense" (infer from context)
   - **amount**: Dollar amount
   - **description**: What the transaction is for
   - **date**: When it happened (default: today)
   - **category_id**: Optional category
   - **notes**: Optional additional notes
5. Call `create_transaction(token, account_id, transaction_type, amount, description, date, category_id, notes)`
6. Call `final_answer()` confirming the transaction was recorded

### Important
- Use `token='none'` for read tools (get_accounts, get_categories) — they use direct SQL
- Use the real JWT token from `login()` only for `create_transaction()` — it uses the API

### If things go wrong
- **Missing required fields**: Ask the user for the missing information (amount, account)
- **Multiple account matches**: List accounts, ask the user to pick one
- **Account not found**: Show available accounts, ask user to choose

## Reference Knowledge

### Transaction Types
- **income**: Money coming in (revenue, salary, etc.) — adds to account balance
- **expense**: Money going out (purchases, bills, etc.) — subtracts from account balance

### Account Types
- **business**: Business accounts — each business has its own account with separate P&L
- **personal**: Personal accounts — personal checking, savings, etc.
- **joint**: Joint accounts — shared with partner/family
