# Skill: View Financial Summary

**Keywords:** balance, accounts, dashboard, finances, how much, money, overview, summary, account balance, net worth
**Inputs:** User request to see financial overview or account balances
**Output:** Formatted financial summary
**When to use:** User wants to see account balances, financial dashboard, or general financial overview

## Procedure:

1. Call `get_financial_dashboard(token='none')` to get the financial overview (uses direct database access, no auth needed)
2. Optionally call `get_accounts(token='none')` for detailed account info
3. Format the data clearly:
   - Account names and balances
   - Monthly income and expenses
   - Budget alerts if any
4. Call `final_answer()` presenting the formatted financial summary

### Important
- Finance read tools use direct SQL — pass `token='none'` as a placeholder
- No need to call `login()` for financial queries
- Only call `login()` if you need to create/modify transactions or events

### If things go wrong
- **No data found**: Tell the user they have no financial data yet
- **Database error**: Report the error details to the user

## Reference Knowledge

### Account Types
- **business**: Business accounts — each business has its own account with separate P&L
- **personal**: Personal accounts — personal checking, savings, etc.
- **joint**: Joint accounts — shared with partner/family
