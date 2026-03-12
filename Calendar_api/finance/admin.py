from django.contrib import admin
from .models import (
    Account, AccountMember, Category, Transaction,
    RecurringTransaction, Subscription, Budget, FinancialGoal
)


class AccountMemberInline(admin.TabularInline):
    model = AccountMember
    extra = 0


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'account_type', 'current_balance', 'currency', 'is_active']
    list_filter = ['account_type', 'is_active', 'currency']
    search_fields = ['name', 'owner__email']
    inlines = [AccountMemberInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_type', 'parent', 'is_tax_deductible', 'tax_category', 'is_active']
    list_filter = ['category_type', 'is_tax_deductible', 'is_active']
    search_fields = ['name', 'tax_category']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['description', 'account', 'transaction_type', 'amount', 'date', 'category', 'status', 'created_by']
    list_filter = ['transaction_type', 'status', 'is_tax_deductible', 'date']
    search_fields = ['description', 'notes', 'account__name']
    date_hierarchy = 'date'


@admin.register(RecurringTransaction)
class RecurringTransactionAdmin(admin.ModelAdmin):
    list_display = ['description', 'account', 'transaction_type', 'amount', 'frequency', 'next_due_date', 'is_active']
    list_filter = ['transaction_type', 'frequency', 'is_active']
    search_fields = ['description', 'account__name']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'cost', 'billing_cycle', 'status', 'next_billing_date', 'is_active']
    list_filter = ['status', 'billing_cycle', 'is_active']
    search_fields = ['name', 'description', 'user__email']


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['category', 'account', 'amount', 'period', 'is_active']
    list_filter = ['period', 'is_active']
    search_fields = ['category__name', 'account__name']


@admin.register(FinancialGoal)
class FinancialGoalAdmin(admin.ModelAdmin):
    list_display = ['goal', 'goal_type', 'account', 'target_amount', 'current_amount']
    list_filter = ['goal_type']
