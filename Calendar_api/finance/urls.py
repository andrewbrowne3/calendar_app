from django.urls import path
from . import views

urlpatterns = [
    # Accounts
    path('accounts/', views.account_list, name='finance-account-list'),
    path('accounts/<uuid:account_id>/', views.account_detail, name='finance-account-detail'),
    path('accounts/<uuid:account_id>/members/', views.account_members, name='finance-account-members'),

    # Transactions
    path('transactions/', views.transaction_list, name='finance-transaction-list'),
    path('transactions/<uuid:txn_id>/', views.transaction_detail, name='finance-transaction-detail'),

    # Transfers
    path('transfers/', views.create_transfer, name='finance-transfer'),

    # Categories
    path('categories/', views.category_list, name='finance-category-list'),
    path('categories/<uuid:category_id>/', views.category_detail, name='finance-category-detail'),

    # Recurring Transactions
    path('recurring/', views.recurring_list, name='finance-recurring-list'),
    path('recurring/<uuid:recurring_id>/', views.recurring_detail, name='finance-recurring-detail'),
    path('recurring/<uuid:recurring_id>/generate/', views.recurring_generate, name='finance-recurring-generate'),

    # Subscriptions
    path('subscriptions/', views.subscription_list, name='finance-subscription-list'),
    path('subscriptions/<uuid:subscription_id>/', views.subscription_detail, name='finance-subscription-detail'),

    # Budgets
    path('budgets/', views.budget_list, name='finance-budget-list'),
    path('budgets/<uuid:budget_id>/', views.budget_detail, name='finance-budget-detail'),

    # Financial Goals
    path('goals/', views.financial_goal_list, name='finance-goal-list'),
    path('goals/<uuid:goal_id>/', views.financial_goal_detail, name='finance-goal-detail'),

    # Reports
    path('reports/profit-loss/', views.report_profit_loss, name='finance-report-profit-loss'),
    path('reports/cash-flow/', views.report_cash_flow, name='finance-report-cash-flow'),
    path('reports/category-breakdown/', views.report_category_breakdown, name='finance-report-category-breakdown'),
    path('reports/budget-status/', views.report_budget_status, name='finance-report-budget-status'),
    path('reports/tax-summary/', views.report_tax_summary, name='finance-report-tax-summary'),
    path('reports/income-vs-expenses/', views.report_income_vs_expenses, name='finance-report-income-vs-expenses'),

    # Dashboard
    path('dashboard/', views.financial_dashboard, name='finance-dashboard'),
]
