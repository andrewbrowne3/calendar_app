from rest_framework import serializers
from .models import (
    Account, AccountMember, Category, Transaction,
    RecurringTransaction, Subscription, Budget, FinancialGoal
)
from authentication.serializers import UserProfileSerializer


class AccountMemberSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True)

    class Meta:
        model = AccountMember
        fields = ['id', 'user', 'user_email', 'role', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class AccountSerializer(serializers.ModelSerializer):
    owner = UserProfileSerializer(read_only=True)
    members = AccountMemberSerializer(many=True, read_only=True)
    monthly_income = serializers.SerializerMethodField()
    monthly_expenses = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'owner', 'name', 'account_type', 'description', 'currency',
            'initial_balance', 'current_balance', 'color', 'icon', 'is_active',
            'members', 'monthly_income', 'monthly_expenses',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'current_balance', 'created_at', 'updated_at']

    def get_monthly_income(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        start = today.replace(day=1)
        from django.db.models import Sum
        result = obj.transactions.filter(
            transaction_type='income', date__gte=start, date__lte=today,
            is_active=True
        ).exclude(status='void').aggregate(total=Sum('amount'))
        return float(result['total'] or 0)

    def get_monthly_expenses(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        start = today.replace(day=1)
        from django.db.models import Sum
        result = obj.transactions.filter(
            transaction_type='expense', date__gte=start, date__lte=today,
            is_active=True
        ).exclude(status='void').aggregate(total=Sum('amount'))
        return float(result['total'] or 0)

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        if 'current_balance' not in validated_data:
            validated_data['current_balance'] = validated_data.get('initial_balance', 0)
        return super().create(validated_data)


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'category_type', 'parent', 'color', 'icon',
            'is_tax_deductible', 'tax_category', 'is_active',
            'subcategories', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_subcategories(self, obj):
        children = obj.subcategories.filter(is_active=True)
        return CategorySerializer(children, many=True).data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    account_detail = AccountSerializer(source='account', read_only=True)
    created_by_detail = UserProfileSerializer(source='created_by', read_only=True)
    category_detail = CategorySerializer(source='category', read_only=True)
    transfer_to_account_detail = AccountSerializer(source='transfer_to_account', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'account', 'account_detail', 'created_by', 'created_by_detail',
            'transaction_type', 'category', 'category_detail', 'amount',
            'description', 'notes', 'date', 'status',
            'transfer_to_account', 'transfer_to_account_detail', 'transfer_transaction',
            'is_tax_deductible', 'tax_category',
            'recurring_transaction', 'calendar_event',
            'tags', 'attachment_url', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'transfer_transaction',
            'recurring_transaction', 'calendar_event',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user

        # Inherit tax fields from category if not explicitly set
        category = validated_data.get('category')
        if category and not validated_data.get('tax_category'):
            validated_data['is_tax_deductible'] = category.is_tax_deductible
            validated_data['tax_category'] = category.tax_category

        transaction = super().create(validated_data)

        # Recalculate account balance
        transaction.account.recalculate_balance()

        return transaction

    def update(self, instance, validated_data):
        old_account = instance.account
        transaction = super().update(instance, validated_data)

        # Recalculate balances for affected accounts
        transaction.account.recalculate_balance()
        if old_account.id != transaction.account.id:
            old_account.recalculate_balance()

        return transaction


class TransferCreateSerializer(serializers.Serializer):
    from_account = serializers.UUIDField()
    to_account = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(max_length=500)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    date = serializers.DateField()
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate(self, attrs):
        if attrs['from_account'] == attrs['to_account']:
            raise serializers.ValidationError("Cannot transfer to the same account")
        if attrs['amount'] <= 0:
            raise serializers.ValidationError("Transfer amount must be positive")
        return attrs


class RecurringTransactionSerializer(serializers.ModelSerializer):
    account_detail = AccountSerializer(source='account', read_only=True)
    category_detail = CategorySerializer(source='category', read_only=True)
    transfer_to_account_detail = AccountSerializer(source='transfer_to_account', read_only=True)

    class Meta:
        model = RecurringTransaction
        fields = [
            'id', 'account', 'account_detail', 'created_by',
            'transaction_type', 'category', 'category_detail', 'amount',
            'description', 'notes', 'frequency', 'start_date', 'end_date',
            'next_due_date', 'day_of_month',
            'transfer_to_account', 'transfer_to_account_detail',
            'is_tax_deductible', 'tax_category',
            'auto_create_calendar_event', 'reminder_days_before',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        if 'next_due_date' not in validated_data:
            validated_data['next_due_date'] = validated_data['start_date']
        return super().create(validated_data)


class SubscriptionSerializer(serializers.ModelSerializer):
    account_detail = AccountSerializer(source='account', read_only=True)
    category_detail = CategorySerializer(source='category', read_only=True)
    monthly_cost = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'name', 'description', 'website_url', 'cost',
            'billing_cycle', 'next_billing_date', 'status',
            'category', 'category_detail', 'account', 'account_detail',
            'color', 'notify_before_renewal', 'auto_create_transaction',
            'notes', 'started_date', 'cancelled_date', 'is_active',
            'monthly_cost', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_monthly_cost(self, obj):
        return round(obj.get_monthly_cost(), 2)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BudgetSerializer(serializers.ModelSerializer):
    account_detail = AccountSerializer(source='account', read_only=True)
    category_detail = CategorySerializer(source='category', read_only=True)
    spent = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'user', 'account', 'account_detail',
            'category', 'category_detail', 'amount', 'period',
            'start_date', 'end_date', 'color', 'is_active',
            'spent', 'remaining', 'percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_spent(self, obj):
        return float(obj.get_spent())

    def get_remaining(self, obj):
        spent = obj.get_spent()
        return float(obj.amount - spent)

    def get_percentage(self, obj):
        spent = obj.get_spent()
        if obj.amount > 0:
            return min(100, round(float(spent / obj.amount) * 100, 1))
        return 0

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class FinancialGoalSerializer(serializers.ModelSerializer):
    account_detail = AccountSerializer(source='account', read_only=True)
    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = FinancialGoal
        fields = [
            'id', 'goal', 'goal_type', 'account', 'account_detail',
            'target_amount', 'current_amount', 'progress_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
