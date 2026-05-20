-- Schema for Personal Finance Dashboard SQLite database

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    amount REAL NOT NULL,
    category TEXT CHECK(category IN ('Food', 'Travel', 'Rent', 'Shopping', 'Entertainment')) NOT NULL,
    description TEXT,
    date TEXT NOT NULL, -- YYYY-MM-DD
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index dates for faster aggregation
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
