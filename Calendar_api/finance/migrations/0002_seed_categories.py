import uuid
from django.db import migrations


def seed_categories(apps, schema_editor):
    Category = apps.get_model('finance', 'Category')

    # Helper to create category and return its UUID
    def create_cat(name, cat_type, color, icon=None, tax_deductible=False, tax_cat=None, parent=None):
        cat = Category.objects.create(
            id=uuid.uuid4(),
            user=None,  # System default
            name=name,
            category_type=cat_type,
            color=color,
            icon=icon,
            is_tax_deductible=tax_deductible,
            tax_category=tax_cat,
            parent=parent,
            is_active=True,
        )
        return cat

    # === INCOME CATEGORIES ===
    create_cat('Salary / Wages', 'income', '#4CAF50', 'briefcase')
    create_cat('Business Revenue', 'income', '#2196F3', 'trending-up')
    create_cat('Freelance / Contract', 'income', '#00BCD4', 'file-text')
    create_cat('Investment Income', 'income', '#8BC34A', 'bar-chart-2')
    create_cat('Rental Income', 'income', '#009688', 'home')
    create_cat('Refunds', 'income', '#607D8B', 'rotate-ccw')
    create_cat('Other Income', 'income', '#9E9E9E', 'plus-circle')

    # === EXPENSE CATEGORIES (with subcategories) ===

    # Housing
    housing = create_cat('Housing', 'expense', '#795548', 'home')
    create_cat('Rent / Mortgage', 'expense', '#795548', None, parent=housing)
    create_cat('Utilities', 'expense', '#795548', None, parent=housing)
    create_cat('Home Insurance', 'expense', '#795548', None, parent=housing)
    create_cat('Maintenance', 'expense', '#795548', None, parent=housing)

    # Transportation
    transport = create_cat('Transportation', 'expense', '#FF5722', 'car')
    create_cat('Gas / Fuel', 'expense', '#FF5722', None, parent=transport)
    create_cat('Car Payment', 'expense', '#FF5722', None, parent=transport)
    create_cat('Auto Insurance', 'expense', '#FF5722', None, parent=transport)
    create_cat('Car Maintenance', 'expense', '#FF5722', None, parent=transport)
    create_cat('Parking', 'expense', '#FF5722', None, parent=transport)

    # Food
    food = create_cat('Food', 'expense', '#FF9800', 'utensils')
    create_cat('Groceries', 'expense', '#FF9800', None, parent=food)
    create_cat('Dining Out', 'expense', '#FF9800', None, parent=food)
    create_cat('Coffee', 'expense', '#FF9800', None, parent=food)

    # Business Expenses (tax-deductible)
    biz = create_cat('Business Expenses', 'expense', '#3F51B5', 'briefcase', True, 'Business Expenses')
    create_cat('Office Supplies', 'expense', '#3F51B5', None, True, 'Office Expenses', biz)
    create_cat('Software / Subscriptions', 'expense', '#3F51B5', None, True, 'Software & Subscriptions', biz)
    create_cat('Professional Services', 'expense', '#3F51B5', None, True, 'Professional Services', biz)
    create_cat('Advertising / Marketing', 'expense', '#3F51B5', None, True, 'Advertising', biz)
    create_cat('Business Travel', 'expense', '#3F51B5', None, True, 'Travel Expenses', biz)
    create_cat('Equipment', 'expense', '#3F51B5', None, True, 'Equipment & Depreciation', biz)
    create_cat('Payroll', 'expense', '#3F51B5', None, True, 'Wages & Salaries', biz)
    create_cat('Meals & Entertainment', 'expense', '#3F51B5', None, True, 'Meals & Entertainment', biz)

    # Healthcare
    health = create_cat('Healthcare', 'expense', '#E91E63', 'heart')
    create_cat('Health Insurance', 'expense', '#E91E63', None, parent=health)
    create_cat('Medical', 'expense', '#E91E63', None, parent=health)
    create_cat('Dental', 'expense', '#E91E63', None, parent=health)
    create_cat('Pharmacy', 'expense', '#E91E63', None, parent=health)

    # Entertainment
    entertainment = create_cat('Entertainment', 'expense', '#9C27B0', 'tv')
    create_cat('Streaming / Subscriptions', 'expense', '#9C27B0', None, parent=entertainment)
    create_cat('Activities', 'expense', '#9C27B0', None, parent=entertainment)
    create_cat('Hobbies', 'expense', '#9C27B0', None, parent=entertainment)

    # Personal
    personal = create_cat('Personal', 'expense', '#00BCD4', 'user')
    create_cat('Clothing', 'expense', '#00BCD4', None, parent=personal)
    create_cat('Grooming', 'expense', '#00BCD4', None, parent=personal)
    create_cat('Gifts', 'expense', '#00BCD4', None, parent=personal)

    # Education
    education = create_cat('Education', 'expense', '#673AB7', 'book-open')
    create_cat('Courses', 'expense', '#673AB7', None, parent=education)
    create_cat('Books', 'expense', '#673AB7', None, parent=education)
    create_cat('Training', 'expense', '#673AB7', None, parent=education)

    # Debt Payments
    debt = create_cat('Debt Payments', 'expense', '#F44336', 'credit-card')
    create_cat('Credit Card', 'expense', '#F44336', None, parent=debt)
    create_cat('Student Loan', 'expense', '#F44336', None, parent=debt)
    create_cat('Personal Loan', 'expense', '#F44336', None, parent=debt)

    # Taxes
    taxes = create_cat('Taxes', 'expense', '#607D8B', 'file-text')
    create_cat('Federal Tax', 'expense', '#607D8B', None, parent=taxes)
    create_cat('State Tax', 'expense', '#607D8B', None, parent=taxes)
    create_cat('Local Tax', 'expense', '#607D8B', None, parent=taxes)
    create_cat('Property Tax', 'expense', '#607D8B', None, parent=taxes)

    # Savings / Investment
    savings = create_cat('Savings / Investment', 'both', '#4CAF50', 'piggy-bank')
    create_cat('Emergency Fund', 'both', '#4CAF50', None, parent=savings)
    create_cat('Retirement', 'both', '#4CAF50', None, parent=savings)
    create_cat('Investment', 'both', '#4CAF50', None, parent=savings)

    # Miscellaneous
    create_cat('Miscellaneous', 'both', '#9E9E9E', 'more-horizontal')


def reverse_seed(apps, schema_editor):
    Category = apps.get_model('finance', 'Category')
    Category.objects.filter(user=None).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_seed),
    ]
