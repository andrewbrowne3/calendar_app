from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, F
from django.db import transaction as db_transaction
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import (
    Account, AccountMember, Category, Transaction,
    RecurringTransaction, Subscription, Budget, FinancialGoal
)
from .serializers import (
    AccountSerializer, AccountMemberSerializer,
    CategorySerializer, TransactionSerializer,
    TransferCreateSerializer, RecurringTransactionSerializer,
    SubscriptionSerializer, BudgetSerializer, FinancialGoalSerializer
)
from authentication.models import User


# ==================== Account Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def account_list(request):
    if request.method == 'GET':
        owned = Account.objects.filter(owner=request.user, is_active=True)
        shared = Account.objects.filter(
            members__user=request.user, is_active=True
        ).distinct()
        accounts = owned.union(shared).order_by('account_type', 'name')
        serializer = AccountSerializer(accounts, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = AccountSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def account_detail(request, account_id):
    account = get_object_or_404(Account, id=account_id)

    # Check permissions
    if account.owner != request.user:
        try:
            member = AccountMember.objects.get(account=account, user=request.user)
            if request.method in ['PUT', 'PATCH', 'DELETE'] and member.role == 'viewer':
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        except AccountMember.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AccountSerializer(account, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = AccountSerializer(account, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if account.owner != request.user:
            return Response({'error': 'Only the owner can delete an account'}, status=status.HTTP_403_FORBIDDEN)
        account.is_active = False
        account.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def account_members(request, account_id):
    account = get_object_or_404(Account, id=account_id, owner=request.user)

    if request.method == 'GET':
        members = AccountMember.objects.filter(account=account)
        serializer = AccountMemberSerializer(members, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        email = request.data.get('user_email')
        if not email:
            return Response({'error': 'user_email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': f'User with email {email} not found'}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({'error': 'Cannot add yourself as a member'}, status=status.HTTP_400_BAD_REQUEST)

        member, created = AccountMember.objects.get_or_create(
            account=account, user=user,
            defaults={'role': request.data.get('role', 'member')}
        )
        if not created:
            return Response({'error': 'User is already a member'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AccountMemberSerializer(member, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ==================== Transaction Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def transaction_list(request):
    if request.method == 'GET':
        # Base queryset: transactions from owned + shared accounts
        transactions = Transaction.objects.filter(
            Q(account__owner=request.user) | Q(account__members__user=request.user),
            is_active=True
        ).distinct()

        # Apply filters
        account_id = request.query_params.get('account_id')
        if account_id:
            transactions = transactions.filter(account_id=account_id)

        category_id = request.query_params.get('category_id')
        if category_id:
            transactions = transactions.filter(category_id=category_id)

        txn_type = request.query_params.get('transaction_type')
        if txn_type:
            transactions = transactions.filter(transaction_type=txn_type)

        start_date = request.query_params.get('start_date')
        if start_date:
            transactions = transactions.filter(date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            transactions = transactions.filter(date__lte=end_date)

        min_amount = request.query_params.get('min_amount')
        if min_amount:
            transactions = transactions.filter(amount__gte=min_amount)

        max_amount = request.query_params.get('max_amount')
        if max_amount:
            transactions = transactions.filter(amount__lte=max_amount)

        search = request.query_params.get('search')
        if search:
            transactions = transactions.filter(
                Q(description__icontains=search) | Q(notes__icontains=search)
            )

        is_tax = request.query_params.get('is_tax_deductible')
        if is_tax is not None:
            transactions = transactions.filter(is_tax_deductible=is_tax.lower() == 'true')

        txn_status = request.query_params.get('status')
        if txn_status:
            transactions = transactions.filter(status=txn_status)

        serializer = TransactionSerializer(transactions, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = TransactionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def transaction_detail(request, txn_id):
    transaction = get_object_or_404(Transaction, id=txn_id, is_active=True)

    # Check access
    account = transaction.account
    if account.owner != request.user:
        if not AccountMember.objects.filter(account=account, user=request.user).exists():
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = TransactionSerializer(transaction, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = TransactionSerializer(transaction, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        transaction.is_active = False
        transaction.save()
        transaction.account.recalculate_balance()

        # If it's a transfer, also soft-delete the paired transaction
        if transaction.transfer_transaction:
            paired = transaction.transfer_transaction
            paired.is_active = False
            paired.save()
            paired.account.recalculate_balance()

        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== Transfer View ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_transfer(request):
    serializer = TransferCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    from_account = get_object_or_404(Account, id=data['from_account'], is_active=True)
    to_account = get_object_or_404(Account, id=data['to_account'], is_active=True)

    # Verify user has access to both accounts
    for acct in [from_account, to_account]:
        if acct.owner != request.user:
            if not AccountMember.objects.filter(account=acct, user=request.user).exclude(role='viewer').exists():
                return Response(
                    {'error': f'No permission to transfer from/to {acct.name}'},
                    status=status.HTTP_403_FORBIDDEN
                )

    with db_transaction.atomic():
        # Create outgoing transaction
        outgoing = Transaction.objects.create(
            account=from_account,
            created_by=request.user,
            transaction_type='transfer',
            amount=data['amount'],
            description=data['description'],
            notes=data.get('notes', ''),
            date=data['date'],
            transfer_to_account=to_account,
            tags=data.get('tags', []),
            status='cleared',
        )

        # Create incoming transaction
        incoming = Transaction.objects.create(
            account=to_account,
            created_by=request.user,
            transaction_type='transfer',
            amount=data['amount'],
            description=data['description'],
            notes=data.get('notes', ''),
            date=data['date'],
            transfer_to_account=from_account,
            tags=data.get('tags', []),
            status='cleared',
        )

        # Link them
        outgoing.transfer_transaction = incoming
        outgoing.save(update_fields=['transfer_transaction'])
        incoming.transfer_transaction = outgoing
        incoming.save(update_fields=['transfer_transaction'])

        # Recalculate balances
        from_account.recalculate_balance()
        to_account.recalculate_balance()

    result = TransactionSerializer(outgoing, context={'request': request})
    return Response(result.data, status=status.HTTP_201_CREATED)


# ==================== Category Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def category_list(request):
    if request.method == 'GET':
        # Return system defaults + user's custom categories (top-level only)
        categories = Category.objects.filter(
            Q(user=None) | Q(user=request.user),
            parent=None, is_active=True
        )
        serializer = CategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = CategorySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def category_detail(request, category_id):
    category = get_object_or_404(Category, id=category_id, is_active=True)

    # Only allow editing user's own categories
    if request.method in ['PUT', 'PATCH', 'DELETE'] and category.user is None:
        return Response({'error': 'Cannot modify system categories'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = CategorySerializer(category, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = CategorySerializer(category, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        category.is_active = False
        category.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== Recurring Transaction Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def recurring_list(request):
    if request.method == 'GET':
        recurring = RecurringTransaction.objects.filter(
            Q(account__owner=request.user) | Q(account__members__user=request.user),
            is_active=True
        ).distinct()

        account_id = request.query_params.get('account_id')
        if account_id:
            recurring = recurring.filter(account_id=account_id)

        serializer = RecurringTransactionSerializer(recurring, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = RecurringTransactionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def recurring_detail(request, recurring_id):
    recurring = get_object_or_404(RecurringTransaction, id=recurring_id, is_active=True)

    if request.method == 'GET':
        serializer = RecurringTransactionSerializer(recurring, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = RecurringTransactionSerializer(recurring, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        recurring.is_active = False
        recurring.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def recurring_generate(request, recurring_id):
    recurring = get_object_or_404(RecurringTransaction, id=recurring_id, is_active=True)

    today = timezone.now().date()
    if recurring.next_due_date > today:
        return Response({'error': 'Not due yet'}, status=status.HTTP_400_BAD_REQUEST)

    # Generate transaction
    txn = Transaction.objects.create(
        account=recurring.account,
        created_by=request.user,
        transaction_type=recurring.transaction_type,
        category=recurring.category,
        amount=recurring.amount,
        description=recurring.description,
        notes=recurring.notes,
        date=recurring.next_due_date,
        is_tax_deductible=recurring.is_tax_deductible,
        tax_category=recurring.tax_category,
        recurring_transaction=recurring,
        status='cleared',
    )

    # Handle transfer
    if recurring.transaction_type == 'transfer' and recurring.transfer_to_account:
        incoming = Transaction.objects.create(
            account=recurring.transfer_to_account,
            created_by=request.user,
            transaction_type='transfer',
            category=recurring.category,
            amount=recurring.amount,
            description=recurring.description,
            notes=recurring.notes,
            date=recurring.next_due_date,
            transfer_to_account=recurring.account,
            recurring_transaction=recurring,
            status='cleared',
        )
        txn.transfer_transaction = incoming
        txn.transfer_to_account = recurring.transfer_to_account
        txn.save(update_fields=['transfer_transaction', 'transfer_to_account'])
        incoming.transfer_transaction = txn
        incoming.save(update_fields=['transfer_transaction'])
        recurring.transfer_to_account.recalculate_balance()

    recurring.account.recalculate_balance()
    recurring.advance_next_due_date()

    serializer = TransactionSerializer(txn, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ==================== Subscription Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def subscription_list(request):
    if request.method == 'GET':
        subscriptions = Subscription.objects.filter(user=request.user, is_active=True)

        sub_status = request.query_params.get('status')
        if sub_status:
            subscriptions = subscriptions.filter(status=sub_status)

        billing_cycle = request.query_params.get('billing_cycle')
        if billing_cycle:
            subscriptions = subscriptions.filter(billing_cycle=billing_cycle)

        category_id = request.query_params.get('category_id')
        if category_id:
            subscriptions = subscriptions.filter(category_id=category_id)

        serializer = SubscriptionSerializer(subscriptions, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = SubscriptionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def subscription_detail(request, subscription_id):
    subscription = get_object_or_404(Subscription, id=subscription_id, user=request.user, is_active=True)

    if request.method == 'GET':
        serializer = SubscriptionSerializer(subscription, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = SubscriptionSerializer(subscription, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        subscription.is_active = False
        subscription.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== Budget Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def budget_list(request):
    if request.method == 'GET':
        budgets = Budget.objects.filter(user=request.user, is_active=True)

        account_id = request.query_params.get('account_id')
        if account_id:
            budgets = budgets.filter(account_id=account_id)

        serializer = BudgetSerializer(budgets, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = BudgetSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def budget_detail(request, budget_id):
    budget = get_object_or_404(Budget, id=budget_id, user=request.user, is_active=True)

    if request.method == 'GET':
        serializer = BudgetSerializer(budget, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = BudgetSerializer(budget, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        budget.is_active = False
        budget.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== Financial Goal Views ====================

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def financial_goal_list(request):
    if request.method == 'GET':
        goals = FinancialGoal.objects.filter(goal__user=request.user)
        serializer = FinancialGoalSerializer(goals, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = FinancialGoalSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def financial_goal_detail(request, goal_id):
    goal = get_object_or_404(FinancialGoal, id=goal_id, goal__user=request.user)

    if request.method == 'GET':
        serializer = FinancialGoalSerializer(goal, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = FinancialGoalSerializer(goal, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        goal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== Report Views ====================

def _get_user_transactions(user, account_id=None):
    """Helper to get base transaction queryset for a user."""
    txns = Transaction.objects.filter(
        Q(account__owner=user) | Q(account__members__user=user),
        is_active=True
    ).exclude(status='void').distinct()

    if account_id:
        txns = txns.filter(account_id=account_id)

    return txns


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_profit_loss(request):
    account_id = request.query_params.get('account_id')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    txns = _get_user_transactions(request.user, account_id)

    if start_date:
        txns = txns.filter(date__gte=start_date)
    if end_date:
        txns = txns.filter(date__lte=end_date)

    income = txns.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0
    expenses = txns.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0
    net = income - expenses

    # Income by category
    income_by_cat = list(txns.filter(transaction_type='income', category__isnull=False).values(
        'category__id', 'category__name', 'category__color'
    ).annotate(total=Sum('amount')).order_by('-total'))

    # Expenses by category
    expense_by_cat = list(txns.filter(transaction_type='expense', category__isnull=False).values(
        'category__id', 'category__name', 'category__color'
    ).annotate(total=Sum('amount')).order_by('-total'))

    return Response({
        'total_income': float(income),
        'total_expenses': float(expenses),
        'net_profit': float(net),
        'income_by_category': income_by_cat,
        'expense_by_category': expense_by_cat,
        'start_date': start_date,
        'end_date': end_date,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_cash_flow(request):
    account_id = request.query_params.get('account_id')
    period = request.query_params.get('period', 'monthly')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    txns = _get_user_transactions(request.user, account_id)

    if not start_date:
        start_date = (timezone.now().date() - timedelta(days=365)).isoformat()
    if not end_date:
        end_date = timezone.now().date().isoformat()

    txns = txns.filter(date__gte=start_date, date__lte=end_date)

    # Group by month
    from django.db.models.functions import TruncMonth, TruncWeek
    trunc_fn = TruncMonth if period == 'monthly' else TruncWeek

    income_by_period = dict(
        txns.filter(transaction_type='income')
        .annotate(period=trunc_fn('date'))
        .values('period')
        .annotate(total=Sum('amount'))
        .values_list('period', 'total')
    )

    expense_by_period = dict(
        txns.filter(transaction_type='expense')
        .annotate(period=trunc_fn('date'))
        .values('period')
        .annotate(total=Sum('amount'))
        .values_list('period', 'total')
    )

    # Merge periods
    all_periods = sorted(set(list(income_by_period.keys()) + list(expense_by_period.keys())))
    cash_flow = []
    for p in all_periods:
        inc = float(income_by_period.get(p, 0))
        exp = float(expense_by_period.get(p, 0))
        cash_flow.append({
            'period': p.isoformat(),
            'income': inc,
            'expenses': exp,
            'net': inc - exp,
        })

    return Response({
        'cash_flow': cash_flow,
        'period_type': period,
        'start_date': start_date,
        'end_date': end_date,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_category_breakdown(request):
    account_id = request.query_params.get('account_id')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    txns = _get_user_transactions(request.user, account_id)

    if start_date:
        txns = txns.filter(date__gte=start_date)
    if end_date:
        txns = txns.filter(date__lte=end_date)

    breakdown = list(txns.filter(
        transaction_type='expense', category__isnull=False
    ).values(
        'category__id', 'category__name', 'category__color'
    ).annotate(
        total=Sum('amount')
    ).order_by('-total'))

    total_expenses = sum(item['total'] for item in breakdown) if breakdown else 0

    for item in breakdown:
        item['percentage'] = round(float(item['total'] / total_expenses * 100), 1) if total_expenses > 0 else 0
        item['total'] = float(item['total'])

    return Response({
        'breakdown': breakdown,
        'total_expenses': float(total_expenses),
        'start_date': start_date,
        'end_date': end_date,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_budget_status(request):
    account_id = request.query_params.get('account_id')
    budgets = Budget.objects.filter(user=request.user, is_active=True)
    if account_id:
        budgets = budgets.filter(Q(account_id=account_id) | Q(account__isnull=True))

    serializer = BudgetSerializer(budgets, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_tax_summary(request):
    year = request.query_params.get('year', str(timezone.now().year))
    account_id = request.query_params.get('account_id')

    txns = _get_user_transactions(request.user, account_id)
    txns = txns.filter(
        date__year=year, is_tax_deductible=True, transaction_type='expense'
    )

    by_tax_category = list(txns.values('tax_category').annotate(
        total=Sum('amount')
    ).order_by('-total'))

    total_deductible = sum(item['total'] for item in by_tax_category) if by_tax_category else 0

    for item in by_tax_category:
        item['total'] = float(item['total'])

    return Response({
        'year': year,
        'total_deductible': float(total_deductible),
        'by_tax_category': by_tax_category,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_income_vs_expenses(request):
    period = request.query_params.get('period', 'monthly')
    months = int(request.query_params.get('months', 12))
    account_id = request.query_params.get('account_id')

    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=months * 30)

    txns = _get_user_transactions(request.user, account_id)
    txns = txns.filter(date__gte=start_date, date__lte=end_date)

    from django.db.models.functions import TruncMonth
    income_data = dict(
        txns.filter(transaction_type='income')
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total=Sum('amount'))
        .values_list('month', 'total')
    )

    expense_data = dict(
        txns.filter(transaction_type='expense')
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total=Sum('amount'))
        .values_list('month', 'total')
    )

    all_months = sorted(set(list(income_data.keys()) + list(expense_data.keys())))
    data = []
    for m in all_months:
        data.append({
            'month': m.isoformat(),
            'income': float(income_data.get(m, 0)),
            'expenses': float(expense_data.get(m, 0)),
        })

    return Response({
        'data': data,
        'period': period,
        'months': months,
    })


# ==================== Dashboard View ====================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def financial_dashboard(request):
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Get all user accounts
    owned = Account.objects.filter(owner=request.user, is_active=True)
    shared = Account.objects.filter(members__user=request.user, is_active=True).distinct()
    accounts = owned.union(shared)

    account_serializer = AccountSerializer(accounts, many=True, context={'request': request})

    # Total balance
    total_balance = sum(float(a.current_balance) for a in accounts)

    # Monthly totals
    txns = Transaction.objects.filter(
        Q(account__owner=request.user) | Q(account__members__user=request.user),
        is_active=True, date__gte=month_start, date__lte=today
    ).exclude(status='void').distinct()

    monthly_income = float(txns.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0)
    monthly_expenses = float(txns.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0)

    # Recent transactions
    recent = Transaction.objects.filter(
        Q(account__owner=request.user) | Q(account__members__user=request.user),
        is_active=True
    ).distinct().order_by('-date', '-created_at')[:10]
    recent_serializer = TransactionSerializer(recent, many=True, context={'request': request})

    # Budget alerts (budgets over 80%)
    budgets = Budget.objects.filter(user=request.user, is_active=True)
    budget_alerts = []
    for budget in budgets:
        spent = budget.get_spent()
        if budget.amount > 0 and (spent / budget.amount) >= Decimal('0.8'):
            budget_alerts.append(BudgetSerializer(budget, context={'request': request}).data)

    # Upcoming recurring (next 30 days)
    upcoming_recurring = RecurringTransaction.objects.filter(
        Q(account__owner=request.user) | Q(account__members__user=request.user),
        is_active=True,
        next_due_date__lte=today + timedelta(days=30)
    ).distinct().order_by('next_due_date')
    recurring_serializer = RecurringTransactionSerializer(upcoming_recurring, many=True, context={'request': request})

    # Subscription totals
    active_subscriptions = Subscription.objects.filter(
        user=request.user, is_active=True, status='active'
    )
    total_monthly_subscriptions = sum(s.get_monthly_cost() for s in active_subscriptions)

    upcoming_renewals = Subscription.objects.filter(
        user=request.user, is_active=True, status__in=['active', 'trial'],
        next_billing_date__lte=today + timedelta(days=7)
    ).order_by('next_billing_date')
    upcoming_renewals_serializer = SubscriptionSerializer(upcoming_renewals, many=True, context={'request': request})

    return Response({
        'total_balance': total_balance,
        'monthly_income': monthly_income,
        'monthly_expenses': monthly_expenses,
        'monthly_savings': monthly_income - monthly_expenses,
        'accounts': account_serializer.data,
        'recent_transactions': recent_serializer.data,
        'budget_alerts': budget_alerts,
        'upcoming_recurring': recurring_serializer.data,
        'total_monthly_subscriptions': round(total_monthly_subscriptions, 2),
        'upcoming_renewals': upcoming_renewals_serializer.data,
    })
