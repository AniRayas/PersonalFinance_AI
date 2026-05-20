import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'finance.db')
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schema.sql')

def get_db_connection():
    """Establishes a connection to the SQLite database and returns it with row factory enabled."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initializes the database using the schema.sql file if it doesn't already exist."""
    if not os.path.exists(SCHEMA_PATH):
        raise FileNotFoundError(f"Schema file not found at {SCHEMA_PATH}")
        
    conn = get_db_connection()
    with open(SCHEMA_PATH, 'r') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def add_transaction(tx_type, amount, category, description, date):
    """Inserts a new transaction into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO transactions (type, amount, category, description, date)
        VALUES (?, ?, ?, ?, ?)
        """,
        (tx_type, amount, category, description, date)
    )
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return inserted_id

def get_all_transactions(category_filter=None, type_filter=None, sort_order="DESC"):
    """Fetches all transactions, with optional filtering and sorting by date."""
    conn = get_db_connection()
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []
    
    if category_filter:
        query += " AND category = ?"
        params.append(category_filter)
        
    if type_filter:
        query += " AND type = ?"
        params.append(type_filter)
        
    # Default sorting is by date descending (newest first), then by id descending
    query += f" ORDER BY date {sort_order}, id {sort_order}"
    
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    # Convert sqlite3.Row to regular python dicts
    return [dict(row) for row in rows]

def get_transaction_by_id(tx_id):
    """Retrieves a single transaction by its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_transaction(tx_id, tx_type, amount, category, description, date):
    """Updates an existing transaction in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE transactions
        SET type = ?, amount = ?, category = ?, description = ?, date = ?
        WHERE id = ?
        """,
        (tx_type, amount, category, description, date, tx_id)
    )
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

def delete_transaction(tx_id):
    """Deletes a transaction by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

def get_monthly_summary(year_month):
    """
    Returns financial summaries for a specific month (format: 'YYYY-MM').
    Returns total income, total expenses, net savings, and category-wise expense breakdown.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Calculate total income for the month
    cursor.execute(
        "SELECT SUM(amount) FROM transactions WHERE type = 'income' AND date LIKE ?",
        (f"{year_month}-%",)
    )
    total_income = cursor.fetchone()[0] or 0.0
    
    # Calculate total expenses for the month
    cursor.execute(
        "SELECT SUM(amount) FROM transactions WHERE type = 'expense' AND date LIKE ?",
        (f"{year_month}-%",)
    )
    total_expense = cursor.fetchone()[0] or 0.0
    
    # Calculate category breakdown for expenses in this month
    cursor.execute(
        """
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND date LIKE ?
        GROUP BY category
        """,
        (f"{year_month}-%",)
    )
    category_rows = cursor.fetchall()
    
    # Ensure all five main categories are represented in the response (default to 0.0 if not present)
    categories = ['Food', 'Travel', 'Rent', 'Shopping', 'Entertainment']
    category_breakdown = {cat: 0.0 for cat in categories}
    for row in category_rows:
        category_breakdown[row['category']] = row['total']
        
    conn.close()
    
    return {
        "month": year_month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": total_income - total_expense,
        "category_breakdown": category_breakdown
    }

def get_global_summary():
    """Returns global/all-time metrics across all transactions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE type = 'income'")
    total_income = cursor.fetchone()[0] or 0.0
    
    cursor.execute("SELECT SUM(amount) FROM transactions WHERE type = 'expense'")
    total_expense = cursor.fetchone()[0] or 0.0
    
    conn.close()
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense
    }

def get_historical_monthly_data(limit=6):
    """
    Returns monthly income and expense aggregates for the last N months.
    Useful for plotting historical charts.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Group by YYYY-MM
    cursor.execute(
        """
        SELECT strftime('%Y-%m', date) as month,
               SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
               SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        GROUP BY month
        ORDER BY month DESC
        LIMIT ?
        """,
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    # Reverse to sort Chronologically (older to newer) for the chart
    data = [dict(row) for row in rows]
    data.reverse()
    return data
