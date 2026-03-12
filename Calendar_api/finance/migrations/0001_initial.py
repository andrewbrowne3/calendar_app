import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('calendar_app', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Account',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('account_type', models.CharField(choices=[('business', 'Business'), ('personal', 'Personal'), ('joint', 'Joint')], max_length=10)),
                ('description', models.TextField(blank=True, null=True)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('initial_balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('current_balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('color', models.CharField(default='#2196F3', max_length=7)),
                ('icon', models.CharField(blank=True, max_length=50, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='financial_accounts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['account_type', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('category_type', models.CharField(choices=[('income', 'Income'), ('expense', 'Expense'), ('both', 'Both')], default='expense', max_length=10)),
                ('color', models.CharField(default='#9E9E9E', max_length=7)),
                ('icon', models.CharField(blank=True, max_length=50, null=True)),
                ('is_tax_deductible', models.BooleanField(default=False)),
                ('tax_category', models.CharField(blank=True, max_length=100, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subcategories', to='finance.category')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='finance_categories', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Categories',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='RecurringTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('transaction_type', models.CharField(choices=[('income', 'Income'), ('expense', 'Expense'), ('transfer', 'Transfer')], max_length=10)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('description', models.CharField(max_length=500)),
                ('notes', models.TextField(blank=True, null=True)),
                ('frequency', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('biweekly', 'Bi-Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], max_length=10)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('next_due_date', models.DateField()),
                ('day_of_month', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('is_tax_deductible', models.BooleanField(default=False)),
                ('tax_category', models.CharField(blank=True, max_length=100, null=True)),
                ('auto_create_calendar_event', models.BooleanField(default=True)),
                ('reminder_days_before', models.PositiveSmallIntegerField(default=3)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recurring_transactions', to='finance.account')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='finance.category')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_recurring_transactions', to=settings.AUTH_USER_MODEL)),
                ('transfer_to_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='incoming_recurring_transfers', to='finance.account')),
            ],
            options={
                'ordering': ['next_due_date'],
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('transaction_type', models.CharField(choices=[('income', 'Income'), ('expense', 'Expense'), ('transfer', 'Transfer')], max_length=10)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('description', models.CharField(max_length=500)),
                ('notes', models.TextField(blank=True, null=True)),
                ('date', models.DateField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('cleared', 'Cleared'), ('reconciled', 'Reconciled'), ('void', 'Void')], default='cleared', max_length=12)),
                ('is_tax_deductible', models.BooleanField(default=False)),
                ('tax_category', models.CharField(blank=True, max_length=100, null=True)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('attachment_url', models.URLField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='finance.account')),
                ('calendar_event', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='financial_transactions', to='calendar_app.event')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transactions', to='finance.category')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_transactions', to=settings.AUTH_USER_MODEL)),
                ('recurring_transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='generated_transactions', to='finance.recurringtransaction')),
                ('transfer_to_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='incoming_transfers', to='finance.account')),
                ('transfer_transaction', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='paired_transfer', to='finance.transaction')),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['account', 'date'], name='finance_tra_account_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['category', 'date'], name='finance_tra_categor_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['transaction_type', 'date'], name='finance_tra_transac_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['created_by', 'date'], name='finance_tra_created_idx'),
        ),
        migrations.CreateModel(
            name='Budget',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('period', models.CharField(choices=[('weekly', 'Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], default='monthly', max_length=10)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('color', models.CharField(default='#FF9800', max_length=7)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to='finance.account')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to='finance.category')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['category__name'],
            },
        ),
        migrations.CreateModel(
            name='AccountMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Owner'), ('member', 'Member'), ('viewer', 'Viewer')], default='member', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='finance.account')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shared_accounts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('account', 'user')},
            },
        ),
        migrations.CreateModel(
            name='FinancialGoal',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('goal_type', models.CharField(choices=[('savings', 'Savings Target'), ('debt_payoff', 'Debt Payoff'), ('revenue', 'Revenue Target'), ('expense_reduction', 'Expense Reduction')], max_length=20)),
                ('target_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('current_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='financial_goals', to='finance.account')),
                ('goal', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='financial_goal', to='calendar_app.goal')),
            ],
        ),
    ]
