# Skill: Create Transfer

**Keywords:** transfer, move money, between accounts, send money, shift funds
**Inputs:** User message with transfer details (from account, to account, amount)
**Output:** Confirmation that the transfer was completed
**When to use:** User wants to transfer or move money between their accounts

## Procedure:

1. Call `login()` to authenticate (needed for creating transfers)
2. Call `get_accounts(token='none')` to identify source and destination accounts (uses direct SQL)
3. Match the user's description to from_account and to_account
4. Parse transfer details:
   - **from_account_id**: Source account
   - **to_account_id**: Destination account
   - **amount**: Dollar amount to transfer
   - **description**: What the transfer is for
   - **date**: When it happened (default: today)
5. Call `create_transfer(token, from_account_id, to_account_id, amount, description, date)`
6. Call `final_answer()` confirming the transfer

### Important
- Use `token='none'` for read tools (get_accounts) — they use direct SQL
- Use the real JWT token from `login()` only for `create_transfer()` — it uses the API

### If things go wrong
- **Account not found**: Show available accounts, ask user to clarify
- **Ambiguous accounts**: List accounts, ask user which is source and which is destination
- **Missing amount**: Ask user how much to transfer

### Transfer Behavior
- Creates paired transactions in both source and destination accounts
- Subtracts from source, adds to destination
