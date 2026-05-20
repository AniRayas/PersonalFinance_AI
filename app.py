from flask import Flask, jsonify, request, render_template
from datetime import datetime
import os
import re
from dotenv import load_dotenv
import database as db

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Initialize the database on startup
db.init_db()

# --- Helper Functions for AI Insights ---

def generate_heuristic_insights(curr, prev):
    """
    Generates structured financial insights using rule-based heuristics.
    Used when OpenAI API key is unavailable or fails.
    """
    insights = []
    
    curr_income = curr.get("total_income", 0.0)
    curr_expense = curr.get("total_expense", 0.0)
    curr_savings = curr.get("net_savings", 0.0)
    curr_breakdown = curr.get("category_breakdown", {})
    
    prev_income = prev.get("total_income", 0.0)
    prev_expense = prev.get("total_expense", 0.0)
    
    # 1. Total Activity check
    if curr_income == 0 and curr_expense == 0:
        return ["No transactions recorded for this month yet. Add income or expenses to see insights!"]
        
    # 2. Deficit / Savings alert
    if curr_expense > curr_income and curr_income > 0:
        deficit_pct = ((curr_expense - curr_income) / curr_income) * 100
        insights.append(
            f"⚠️ Warning: Your expenses exceed your income by {deficit_pct:.1f}%. "
            f"You spent ₹{curr_expense - curr_income:.2f} more than you earned."
        )
    elif curr_income > 0:
        savings_rate = (curr_savings / curr_income) * 100
        if savings_rate >= 20:
            insights.append(
                f"🎉 Excellent! You have a healthy savings rate of {savings_rate:.1f}% this month. "
                f"You saved ₹{curr_savings:.2f}."
            )
        elif savings_rate > 0:
            insights.append(
                f"💡 Good job saving ₹{curr_savings:.2f} ({savings_rate:.1f}% of income), "
                f"but try to aim for 20% savings by reviewing optional expenses."
            )

    # 3. Monthly Expense Comparison
    if prev_expense > 0:
        expense_diff = curr_expense - prev_expense
        diff_pct = (expense_diff / prev_expense) * 100
        if diff_pct > 5:
            insights.append(
                f"📈 Your monthly spending increased by {diff_pct:.1f}% compared to last month "
                f"(an extra ₹{expense_diff:.2f}). Consider budgeting more tightly."
            )
        elif diff_pct < -5:
            insights.append(
                f"📉 Fantastic! Your monthly spending has decreased by {abs(diff_pct):.1f}% "
                f"compared to last month. Keep up the disciplined budgeting!"
            )
            
    # 4. Top Category analysis
    if curr_expense > 0:
        # Find the highest expense category
        sorted_categories = sorted(curr_breakdown.items(), key=lambda x: x[1], reverse=True)
        top_cat, top_amount = sorted_categories[0]
        if top_amount > 0:
            top_pct = (top_amount / curr_expense) * 100
            insights.append(
                f"🛒 Your biggest expense is **{top_cat}** at ₹{top_amount:.2f}, "
                f"making up {top_pct:.1f}% of your total spending."
            )
            
            # Suggestion based on category
            if top_cat == 'Shopping' and top_pct > 30:
                insights.append("🛍️ Shopping is consuming a large part of your budget. Ask yourself if these purchases are 'needs' or 'wants'.")
            elif top_cat == 'Entertainment' and top_pct > 25:
                insights.append("🍿 You spent a significant portion on Entertainment. Try exploring free local activities or splitting subscription costs.")
            elif top_cat == 'Food' and top_pct > 35:
                insights.append("🍔 Food is your highest expense. Planning meals and cooking at home more often can save you a substantial sum.")
            elif top_cat == 'Travel' and top_pct > 25:
                insights.append("✈️ Travel costs are high this month. Look for carpooling or public transit options to lower daily commute costs.")

    return insights

def get_ai_insights_from_openai(curr, prev):
    """
    Calls OpenAI to generate personalized financial insights using gpt-4o-mini.
    Falls back to heuristic generation if the call fails or API key is not configured.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return generate_heuristic_insights(curr, prev), True
        
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Prepare context data for the LLM
        curr_month = curr.get("month", "this month")
        prev_month = prev.get("month", "last month")
        
        prompt = f"""
You are an expert personal finance AI assistant. Analyze the user's monthly financial data below and provide 3 to 4 short, highly personalized, and actionable financial insights.
Keep your recommendations tailored to a college student, using a friendly, encouraging, but direct tone. Use Indian Rupees (₹) for all currency values. Use emojis at the start of each bullet point.

Current Month ({curr_month}):
- Total Income: ₹{curr.get("total_income", 0.0):.2f}
- Total Expenses: ₹{curr.get("total_expense", 0.0):.2f}
- Net Savings: ₹{curr.get("net_savings", 0.0):.2f}
- Expense Categories: {curr.get("category_breakdown", {})}

Previous Month ({prev_month}):
- Total Income: ₹{prev.get("total_income", 0.0):.2f}
- Total Expenses: ₹{prev.get("total_expense", 0.0):.2f}

Generate 3-4 bullet-point insights. Do not include markdown headers or introduction text. Just list the bullets directly.
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional financial advisor specializing in budgeting for college students and young adults."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )
        
        raw_text = response.choices[0].message.content.strip()
        # Parse the raw bullet points into a list
        insights = [line.strip().lstrip('-*• ').strip() for line in raw_text.split('\n') if line.strip()]
        return insights, False
        
    except Exception as e:
        print(f"OpenAI API call failed: {e}. Falling back to rule-based heuristics.")
        return generate_heuristic_insights(curr, prev), True


# --- Validation Helpers ---

def validate_transaction_data(data):
    """Validates the input dictionary for transaction creation or updates."""
    errors = {}
    
    tx_type = data.get("type")
    if tx_type not in ['income', 'expense']:
        errors["type"] = "Type must be either 'income' or 'expense'."
        
    try:
        amount = float(data.get("amount", 0.0))
        if amount <= 0:
            errors["amount"] = "Amount must be a positive number."
    except (ValueError, TypeError):
        errors["amount"] = "Amount must be a valid number."
        
    category = data.get("category")
    valid_categories = ['Food', 'Travel', 'Rent', 'Shopping', 'Entertainment']
    if category not in valid_categories:
        errors["category"] = f"Category must be one of: {', '.join(valid_categories)}."
        
    date_str = data.get("date")
    if not date_str or not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        errors["date"] = "Date must be in YYYY-MM-DD format."
    else:
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            errors["date"] = "Date must be a calendar date."
            
    return errors


# --- Frontend Page Routes ---

@app.route('/')
def index():
    """Serves the main Dashboard view."""
    return render_template('index.html')

@app.route('/transactions')
def transactions_page():
    """Serves the Transactions table and management view."""
    return render_template('transactions.html')


# --- REST API Endpoints ---

@app.route('/api/transactions', methods=['GET'])
def api_get_transactions():
    """Fetches list of transactions with optional filtering."""
    category = request.args.get('category')
    tx_type = request.args.get('type')
    
    txs = db.get_all_transactions(category_filter=category, type_filter=tx_type)
    return jsonify(txs)

@app.route('/api/transactions/<int:tx_id>', methods=['GET'])
def api_get_transaction(tx_id):
    """Retrieves a single transaction by ID."""
    tx = db.get_transaction_by_id(tx_id)
    if not tx:
        return jsonify({"error": "Transaction not found."}), 404
    return jsonify(tx)

@app.route('/api/transactions', methods=['POST'])
def api_add_transaction():
    """Adds a new transaction."""
    data = request.get_json() or {}
    
    # Run validation
    errors = validate_transaction_data(data)
    if errors:
        return jsonify({"errors": errors}), 400
        
    inserted_id = db.add_transaction(
        tx_type=data["type"],
        amount=float(data["amount"]),
        category=data["category"],
        description=data.get("description", "").strip(),
        date=data["date"]
    )
    
    return jsonify({
        "message": "Transaction added successfully.",
        "id": inserted_id
    }), 201

@app.route('/api/transactions/<int:tx_id>', methods=['PUT'])
def api_update_transaction(tx_id):
    """Updates an existing transaction by ID."""
    data = request.get_json() or {}
    
    existing = db.get_transaction_by_id(tx_id)
    if not existing:
        return jsonify({"error": "Transaction not found."}), 404
        
    # Run validation
    errors = validate_transaction_data(data)
    if errors:
        return jsonify({"errors": errors}), 400
        
    db.update_transaction(
        tx_id=tx_id,
        tx_type=data["type"],
        amount=float(data["amount"]),
        category=data["category"],
        description=data.get("description", "").strip(),
        date=data["date"]
    )
    
    return jsonify({"message": "Transaction updated successfully."})

@app.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
def api_delete_transaction(tx_id):
    """Deletes a transaction by ID."""
    existing = db.get_transaction_by_id(tx_id)
    if not existing:
        return jsonify({"error": "Transaction not found."}), 404
        
    db.delete_transaction(tx_id)
    return jsonify({"message": "Transaction deleted successfully."})

@app.route('/api/summary', methods=['GET'])
def api_summary():
    """Returns monthly summary, historical summaries, and global balances."""
    # Target month defaults to current year-month
    target_month = request.args.get('month')
    if not target_month or not re.match(r"^\d{4}-\d{2}$", target_month):
        target_month = datetime.now().strftime("%Y-%m")
        
    current_summary = db.get_monthly_summary(target_month)
    global_summary = db.get_global_summary()
    historical_data = db.get_historical_monthly_data(limit=6)
    
    return jsonify({
        "current_month": current_summary,
        "global": global_summary,
        "historical": historical_data
    })

@app.route('/api/insights', methods=['GET'])
def api_insights():
    """Generates AI insights for the specified month."""
    # Target month defaults to current year-month
    target_month = request.args.get('month')
    if not target_month or not re.match(r"^\d{4}-\d{2}$", target_month):
        target_month = datetime.now().strftime("%Y-%m")
        
    # Get current month details
    curr = db.get_monthly_summary(target_month)
    
    # Calculate previous month year-month string
    try:
        year, month = map(int, target_month.split("-"))
        if month == 1:
            prev_year = year - 1
            prev_month = 12
        else:
            prev_year = year
            prev_month = month - 1
        prev_month_str = f"{prev_year:04d}-{prev_month:02d}"
    except Exception:
        prev_month_str = ""
        
    prev = db.get_monthly_summary(prev_month_str) if prev_month_str else {}
    
    # Run insights logic
    insights, is_fallback = get_ai_insights_from_openai(curr, prev)
    
    return jsonify({
        "month": target_month,
        "insights": insights,
        "is_fallback": is_fallback
    })

if __name__ == '__main__':
    # Running in debug mode locally
    app.run(host='127.0.0.1', port=5000, debug=True)
