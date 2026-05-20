# AuraFinance - AI Personal Finance Dashboard

A simple, visually clean, and modern AI-powered Personal Finance Dashboard designed specifically for CSE academic coursework. This application helps users record transactions, visually analyze monthly expenses, and receive intelligent financial warnings and tips based on their spending behavior.

---

## 🌟 Key Features

1. **Transaction Management (CRUD)**: Log, edit, and delete income and expenses manually with ease.
2. **Interactive Charting**:
   - **Category Breakdown**: A Doughnut Chart (Chart.js) detailing spending across main categories: *Food, Travel, Rent, Shopping, and Entertainment*.
   - **Historical Summary**: A multi-bar chart comparing Income vs. Expense aggregates over the last 6 months.
3. **Smart Metrics**: Cards showing *All-Time Balance*, *Monthly Income*, *Monthly Expenses*, and *Net Monthly Savings*.
4. **AI-Powered Financial Insights**:
   - Generates personalized recommendations (e.g., spending increases, budget warnings, category audits).
   - **Graceful Fallback Heuristic**: If no OpenAI API Key is configured, the backend automatically launches a rule-based algorithm to produce insights based on financial parameters.
5. **Modern Aesthetics**: Sleek dark mode using a custom glassmorphism design system (`backdrop-filter` styles, neon gradients, and clean responsive grids).

---

## 📂 Project Structure

```
personal_finance_dashboard/
│
├── app.py                  # Flask web controller & API routes
├── database.py             # SQLite helper methods for CRUD & analytics
├── schema.sql              # Table schema creation scripts
├── requirements.txt        # Python package dependency list
├── README.md               # Setup, running, and deployment guides
│
├── templates/
│   ├── base.html           # Main template with layout structure and navigation
│   ├── index.html          # Dashboard page (charts, summary cards, AI insights)
│   └── transactions.html   # Transactions listing page (tables, CRUD forms)
│
└── static/
    ├── css/
    │   └── style.css       # Glassmorphic dark styling & keyframe animations
    └── js/
        └── app.js          # REST integration, AJAX handling, Chart.js setups
```

---

## 🛢️ Database Schema

The application uses an embedded **SQLite** database (`finance.db`) initialized automatically on first startup.

### Transactions Table (`transactions`)
| Column Name | Data Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary Key, Auto-Increment |
| `type` | `TEXT` | Checked value: `income` or `expense` |
| `amount` | `REAL` | Greater than 0.0 (validated at backend and client) |
| `category` | `TEXT` | Checked value: `Food`, `Travel`, `Rent`, `Shopping`, `Entertainment` |
| `description`| `TEXT` | Optional transaction comments |
| `date` | `TEXT` | Transaction calendar date formatted as `YYYY-MM-DD` |
| `created_at` | `TIMESTAMP`| Automatically populated with record insertion timestamp |

---

## 🛠️ Step-by-Step Local Setup

Follow these instructions to run the application on your computer:

### Prerequisites
Make sure you have **Python 3.8+** installed. You can check your version in a terminal:
```bash
python --version
```

### 1. Clone or Open the Workspace Directory
Ensure all source files are placed in your working directory:
`personal_finance_dashboard/`

### 2. Set Up a Python Virtual Environment
Creating a virtual environment ensures dependencies do not conflict with system packages:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (Command Prompt):
venv\Scripts\activate
# On Windows (PowerShell):
venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
Install all required libraries using the package manager `pip`:
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables (Optional)
To use advanced AI insights via OpenAI, create a file named `.env` in the root folder and add your API key:
```env
OPENAI_API_KEY=your-actual-api-key-here
```
*Note: If you do not have an API key, leave this empty. The application will automatically fall back to rule-based insights.*

### 5. Launch the Server
Start the Flask application:
```bash
python app.py
```
You should see:
```text
Database initialized successfully.
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser to access the dashboard!

---

## 💡 AI Insights Logic

- **OpenAI Mode**: Send prompt containing the user's current month details (income, expenses, category spending breakdown) and the previous month's figures. Ask `gpt-4o-mini` to provide 3-4 friendly, concise financial tips or warnings tailored to college students.
- **Rule Heuristic Mode**: If `OPENAI_API_KEY` is not found, the app evaluates rules:
  1. *Deficit Alert*: If expenses exceed income.
  2. *Savings Rate Check*: Encourages user if savings rate is >20%, warns if savings rate is low.
  3. *Monthly Delta*: Reports if expenses increased or decreased by more than 5% compared to the prior month.
  4. *Top Expense Analyzer*: Identifies the highest spending category, and triggers category-specific budget tips (e.g. food prep recommendations for Food, public transport ideas for Travel, etc.).

---

## 🚀 Deployment Instructions

When ready to show your project, you can deploy it to public hosting platforms:

### Option A: Deploy to Render.com (Recommended for beginners)
Render is a cloud hosting provider with free tiers for web services.
1. Create a `gunicorn` configuration by installing it in your venv: `pip install gunicorn` and adding it to `requirements.txt`.
2. Push your project code to a public/private GitHub repository.
3. Sign up at [Render.com](https://render.com) and create a new **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
6. Under Environment variables, add `OPENAI_API_KEY` if desired.
7. Click **Deploy**. Render will host your Flask server and SQLite database!
   *(Note: SQLite databases on Render's free tier are reset when the service spins down. For persistent storage on cloud servers, consider configuring PostgreSQL).*

### Option B: Deploy to PythonAnywhere
PythonAnywhere specializes in hosting Python applications.
1. Sign up for a free account at [PythonAnywhere](https://www.pythonanywhere.com).
2. Go to the **Files** tab and upload your project zip, or use the **Consoles** tab to clone your Git repository.
3. Go to the **Web** tab and click **Add a new web app**. Choose **Manual Configuration** and choose your Python version.
4. Set up a Virtualenv path in the Web configurations and run a console to run `pip install -r requirements.txt`.
5. Edit your WSGI file (linked on the Web tab) to point to your project directory and load your Flask app:
   ```python
   import sys
   path = '/home/username/personal_finance_dashboard'
   if path not in sys.path:
       sys.path.insert(0, path)
   from app import app as application
   ```
6. Reload the web app, and it will be live at `http://username.pythonanywhere.com`!
