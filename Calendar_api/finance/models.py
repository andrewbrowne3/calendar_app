from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Account(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('business', 'Business'),
        ('personal', 'Personal'),
        ('joint', 'Joint'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='financial_accounts')
    name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    currency = models.CharField(max_length=3, default='USD')
    initial_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    color = models.CharField(max_length=7, default='#2196F3')
    icon = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['account_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_account_type_display()})"

    def recalculate_balance(self):
        from django.db.models import Sum, Q
        income = self.transactions.filter(
            transaction_type='income', is_active=True
        ).exclude(status='void').aggregate(total=Sum('amount'))['total'] or 0

        expenses = self.transactions.filter(
            transaction_type='expense', is_active=True
        ).exclude(status='void').aggregate(total=Sum('amount'))['total'] or 0

        transfers_out = self.transactions.filter(
            transaction_type='transfer', is_active=True
        ).exclude(status='void').aggregate(total=Sum('amount'))['total'] or 0

        transfers_in = Transaction.objects.filter(
            transfer_to_account=self, transaction_type='transfer', is_active=True
        ).exclude(status='void').aggregate(total=Sum('amount'))['total'] or 0

        self.current_balance = self.initial_balance + income - expenses - transfers_out + transfers_in
        self.save(update_fields=['current_balance', 'updated_at'])


class AccountMember(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('member', 'Member'),
        ('viewer', 'Viewer'),
    ]

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_accounts')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['account', 'user']

    def __str__(self):
        return f"{self.user.email} on {self.account.name} ({self.role})"


class Category(models.Model):
    CATEGORY_TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('both', 'Both'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='finance_categories', blank=True, null=True
    )  # null = system default category
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=10, choices=CATEGORY_TYPE_CHOICES, default='expense')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='subcategories')
    color = models.CharField(max_length=7, default='#9E9E9E')
    icon = models.CharField(max_length=50, blank=True, null=True)
    is_tax_deductible = models.BooleanField(default=False)
    tax_category = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name


class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('cleared', 'Cleared'),
        ('reconciled', 'Reconciled'),
        ('void', 'Void'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, blank=True, null=True, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # Always positive
    description = models.CharField(max_length=500)
    notes = models.TextField(blank=True, null=True)
    date = models.DateField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='cleared')

    # Transfer-specific fields
    transfer_to_account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='incoming_transfers'
    )
    transfer_transaction = models.OneToOneField(
        'self', on_delete=models.SET_NULL, blank=True, null=True,
        related_name='paired_transfer'
    )

    # Tax fields
    is_tax_deductible = models.BooleanField(default=False)
    tax_category = models.CharField(max_length=100, blank=True, null=True)

    # Recurring reference
    recurring_transaction = models.ForeignKey(
        'RecurringTransaction', on_delete=models.SET_NULL, blank=True, null=True,
        related_name='generated_transactions'
    )

    # Calendar integration
    calendar_event = models.ForeignKey(
        'calendar_app.Event', on_delete=models.SET_NULL, blank=True, null=True,
        related_name='financial_transactions'
    )

    # Metadata
    tags = models.JSONField(default=list, blank=True)
    attachment_url = models.URLField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['account', 'date']),
            models.Index(fields=['category', 'date']),
            models.Index(fields=['transaction_type', 'date']),
            models.Index(fields=['created_by', 'date']),
        ]

    def __str__(self):
        return f"{self.description} - ${self.amount} ({self.date})"


class RecurringTransaction(models.Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='recurring_transactions')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_recurring_transactions')
    transaction_type = models.CharField(max_length=10, choices=Transaction.TRANSACTION_TYPE_CHOICES)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=500)
    notes = models.TextField(blank=True, null=True)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    next_due_date = models.DateField()
    day_of_month = models.PositiveSmallIntegerField(blank=True, null=True)

    # Transfer-specific
    transfer_to_account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='incoming_recurring_transfers'
    )

    # Tax
    is_tax_deductible = models.BooleanField(default=False)
    tax_category = models.CharField(max_length=100, blank=True, null=True)

    # Calendar integration
    auto_create_calendar_event = models.BooleanField(default=True)
    reminder_days_before = models.PositiveSmallIntegerField(default=3)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_due_date']

    def __str__(self):
        return f"{self.description} - ${self.amount} ({self.frequency})"

    def advance_next_due_date(self):
        from dateutil.relativedelta import relativedelta
        if self.frequency == 'daily':
            self.next_due_date += timezone.timedelta(days=1)
        elif self.frequency == 'weekly':
            self.next_due_date += timezone.timedelta(weeks=1)
        elif self.frequency == 'biweekly':
            self.next_due_date += timezone.timedelta(weeks=2)
        elif self.frequency == 'monthly':
            self.next_due_date += relativedelta(months=1)
        elif self.frequency == 'quarterly':
            self.next_due_date += relativedelta(months=3)
        elif self.frequency == 'yearly':
            self.next_due_date += relativedelta(years=1)

        if self.end_date and self.next_due_date > self.end_date:
            self.is_active = False

        self.save(update_fields=['next_due_date', 'is_active', 'updated_at'])


class Subscription(models.Model):
    BILLING_CYCLE_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
        ('trial', 'Trial'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscriptions')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLE_CHOICES, default='monthly')
    next_billing_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, blank=True, null=True, related_name='subscriptions')
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, blank=True, null=True, related_name='subscriptions')
    color = models.CharField(max_length=7, default='#9C27B0')
    notify_before_renewal = models.PositiveSmallIntegerField(default=3)
    auto_create_transaction = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    started_date = models.DateField(blank=True, null=True)
    cancelled_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_billing_date']

    def __str__(self):
        return f"{self.name} - ${self.cost}/{self.billing_cycle}"

    def get_monthly_cost(self):
        if self.billing_cycle == 'weekly':
            return float(self.cost) * 52 / 12
        elif self.billing_cycle == 'monthly':
            return float(self.cost)
        elif self.billing_cycle == 'quarterly':
            return float(self.cost) / 3
        elif self.billing_cycle == 'yearly':
            return float(self.cost) / 12
        return float(self.cost)

    def advance_next_billing_date(self):
        from dateutil.relativedelta import relativedelta
        if self.billing_cycle == 'weekly':
            self.next_billing_date += timezone.timedelta(weeks=1)
        elif self.billing_cycle == 'monthly':
            self.next_billing_date += relativedelta(months=1)
        elif self.billing_cycle == 'quarterly':
            self.next_billing_date += relativedelta(months=3)
        elif self.billing_cycle == 'yearly':
            self.next_billing_date += relativedelta(years=1)
        self.save(update_fields=['next_billing_date', 'updated_at'])


class Budget(models.Model):
    PERIOD_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, blank=True, null=True, related_name='budgets')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budgets')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='monthly')
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#FF9800')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category__name']

    def __str__(self):
        acct = self.account.name if self.account else 'All Accounts'
        return f"{self.category.name} budget: ${self.amount}/{self.period} ({acct})"

    def get_current_period_dates(self):
        today = timezone.now().date()
        if self.period == 'weekly':
            start = today - timezone.timedelta(days=today.weekday())
            end = start + timezone.timedelta(days=6)
        elif self.period == 'monthly':
            start = today.replace(day=1)
            from dateutil.relativedelta import relativedelta
            end = start + relativedelta(months=1) - timezone.timedelta(days=1)
        elif self.period == 'quarterly':
            quarter_month = ((today.month - 1) // 3) * 3 + 1
            start = today.replace(month=quarter_month, day=1)
            from dateutil.relativedelta import relativedelta
            end = start + relativedelta(months=3) - timezone.timedelta(days=1)
        elif self.period == 'yearly':
            start = today.replace(month=1, day=1)
            end = today.replace(month=12, day=31)
        else:
            start = today.replace(day=1)
            from dateutil.relativedelta import relativedelta
            end = start + relativedelta(months=1) - timezone.timedelta(days=1)
        return start, end

    def get_spent(self):
        from django.db.models import Sum
        start, end = self.get_current_period_dates()
        filters = {
            'category': self.category,
            'transaction_type': 'expense',
            'date__gte': start,
            'date__lte': end,
            'is_active': True,
        }
        if self.account:
            filters['account'] = self.account
        else:
            filters['account__owner'] = self.user

        return Transaction.objects.filter(**filters).exclude(
            status='void'
        ).aggregate(total=Sum('amount'))['total'] or 0


class FinancialGoal(models.Model):
    GOAL_TYPE_CHOICES = [
        ('savings', 'Savings Target'),
        ('debt_payoff', 'Debt Payoff'),
        ('revenue', 'Revenue Target'),
        ('expense_reduction', 'Expense Reduction'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.OneToOneField('calendar_app.Goal', on_delete=models.CASCADE, related_name='financial_goal')
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPE_CHOICES)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, blank=True, null=True, related_name='financial_goals')
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.goal.title} - ${self.target_amount} ({self.goal_type})"

    @property
    def progress_percentage(self):
        if self.target_amount and self.target_amount > 0:
            return min(100, float(self.current_amount / self.target_amount) * 100)
        return 0
