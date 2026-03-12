# Skill: Generate Financial Report

**Keywords:** profit, loss, budget, tax, report, p&l, profit and loss, cash flow, category breakdown, income vs expenses, tax deduction, deductible, show me my p
**Inputs:** User request for a financial report with optional account and date range
**Output:** Formatted financial report
**When to use:** User wants a P&L report, budget status, tax summary, or other financial report

## Procedure:

1. Determine the report type from the user's request:
   - P&L / profit & loss → `get_profit_loss()`
   - Budget status → `get_budget_status()`
   - Tax summary / deductions → `get_tax_summary()`
2. If the user specifies an account, call `get_accounts(token='none')` to resolve account_id
3. Determine date range (default: current year or last 12 months)
4. Call the appropriate report tool (pass `token='none'` as placeholder):
   - `get_profit_loss(token='none', account_id='...', start_date='...', end_date='...')`
   - `get_budget_status(token='none')`
   - `get_tax_summary(token='none', year='...')`
5. Format and present the report clearly
6. Call `final_answer()` with the formatted report

### Important
- Finance read tools use direct SQL — pass `token='none'` as a placeholder
- No need to call `login()` for financial queries
- Only call `login()` if you need to create/modify transactions or events

### If things go wrong
- **No data for period**: Tell the user no transactions found for the specified period
- **Account not found**: Show available accounts, ask user to choose
- **Database error**: Report the error details to the user

## Reference Knowledge

### Report Types
- **profit-loss**: Income/expense breakdown by category for a date range
- **budget-status**: Current budget utilization for all budgets
- **tax-summary**: Tax-deductible expense summary by category for a year
