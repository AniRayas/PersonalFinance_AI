# 🌌 AuraFinance — AI-Powered Personal Finance Dashboard



AuraFinance is a premium, visually clean, and modern personal finance tracker designed for students and young adults. Powered by a Flask backend and a responsive frontend UI, AuraFinance tracks income and expenses, visualizes monthly analytics using interactive Chart.js modules, and delivers intelligent financial advice through a hybrid AI Insights engine.

---

## ✨ Features

- **📊 Interactive Analytics**: Real-time category-wise spending distribution (Doughnut charts) and 6-month historical income vs. expense progress (Bar charts) powered by **Chart.js**.
- **💳 Complete CRUD Ledger**: Add, edit, and delete transactions with immediate frontend updates and input validation.
- **🤖 Hybrid AI Insights Engine**:
  - **OpenAI GPT-4o-mini Mode**: Generates personalized, friendly, and actionable budgeting tips based on monthly cash flows.
  - **Local Heuristics Fallback**: Evaluates spending patterns locally using rule-based metrics (savings rates, deficit alerts, categories) when no API key is set.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Python 3, Flask framework (REST APIs)
- **Database**: SQLite3 (relational database with automatic schema initialization)
- **Frontend**: Vanilla HTML5, custom CSS3, Bootstrap 5 (modals and base grids)
- **Analytics**: Chart.js (interactive client-side charting)
- **AI Integrations**: OpenAI API (v1.x Client) with local rule-based heuristic analyzers

---

## 📁 Repository Structure

```
personal_finance_dashboard/
├── app.py                  # Server controller & API endpoints
├── database.py             # SQLite interface & query aggregation helpers
├── schema.sql              # Database table schema definition
├── requirements.txt        # Python package dependencies
├── .gitignore              # Files excluded from version control
├── README.md               # Product documentation
├── templates/
│   ├── base.html           # Core HTML layout, navbar, & scripts load
│   ├── index.html          # Dashboard page (Metric cards, charts, AI feed)
│   └── transactions.html   # Ledger page (CRUD table & modal forms)
└── static/
    ├── css/
    │   └── style.css       # Premium stylesheets & keyframe animations
    └── js/
        └── app.js          # REST integrations, chart renderers & AJAX handlers
```

---

## ⚙️ Quick Start Guide

### Prerequisites
Ensure you have **Python** installed on your system.

### 1. Set Up the Repository
```bash
# Clone the repository
git clone https://github.com/AniRayas/PersonalFinance_AI.git
cd PersonalFinance_AI
```

### 2. Configure Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup API Keys (Optional)
If you wish to use advanced GPT insights, create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```
*Note: If no `.env` file is created, the system operates seamlessly using local heuristic rules.*

### 5. Launch Server
```bash
python app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser to start tracking!

---

## 💡 AI Insights Logic

AuraFinance employs a two-tier analyzer to process transaction history:
1. **GPT Mode**: Encapsulates monthly income, category spending ratios, and historical margins. It prompts the AI model to return tailored, bulleted advice suited for college budgets.
2. **Local Heuristics**: Analyzes factors such as:
   - **Savings Rates**: Alerts if savings rate falls below 20% of income.
   - **Budget Deficits**: Fires alerts if expenses exceed earnings.
   - **Historical Comparison**: Flags spending changes greater than 5% compared to the prior month.
   - **Top Expense Audits**: Targets category outliers (e.g. Shopping/Food) and delivers behavioral suggestions.

---

## 🔒 Security Practices

- **API Keys**: Stored securely in `.env` variables and excluded from Git using `.gitignore`.
- **Database File**: The database file `finance.db` is stored locally and git-ignored to prevent pushing sensitive personal records.


