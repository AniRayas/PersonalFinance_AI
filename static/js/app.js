// Global state to store instances of Chart.js charts
let categoryChartInstance = null;
let historyChartInstance = null;

// Utility function to format numbers as INR currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(value);
}

// Get current date string in YYYY-MM-DD format
function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Get current month string in YYYY-MM format
function getCurrentMonthString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Check which page is currently loaded
    const dashboardFilter = document.getElementById('month-filter');
    const transactionsTable = document.getElementById('transactions-table-body');
    
    if (dashboardFilter) {
        initDashboard();
    } else if (transactionsTable) {
        initTransactionsLedger();
    }
});

// ==========================================
// 1. DASHBOARD CONTROLLER AND DATA FETCHERS
// ==========================================

function initDashboard() {
    const monthFilter = document.getElementById('month-filter');
    
    // Set default value of month filter to current year-month
    monthFilter.value = getCurrentMonthString();
    
    // Initial fetch of summaries and insights
    loadDashboardData(monthFilter.value);
    loadAIInsights(monthFilter.value);
    
    // Listen to changes on month picker
    monthFilter.addEventListener('change', (e) => {
        loadDashboardData(e.target.value);
        loadAIInsights(e.target.value);
    });
}

function loadDashboardData(month) {
    fetch(`/api/summary?month=${month}`)
        .then(res => res.json())
        .then(data => {
            // Update Stats Cards
            document.getElementById('metric-balance').innerText = formatCurrency(data.global.balance);
            document.getElementById('metric-income').innerText = formatCurrency(data.current_month.total_income);
            document.getElementById('metric-expense').innerText = formatCurrency(data.current_month.total_expense);
            document.getElementById('metric-savings').innerText = formatCurrency(data.current_month.net_savings);
            
            // Adjust savings color based on negative/positive net
            const savingsVal = document.getElementById('metric-savings');
            if (data.current_month.net_savings < 0) {
                savingsVal.className = "metric-value font-space-grotesk text-expense";
            } else {
                savingsVal.className = "metric-value font-space-grotesk text-savings";
            }
            
            // Render category doughnut chart
            renderCategoryChart(data.current_month.category_breakdown);
            
            // Render historical line/bar chart
            renderHistoryChart(data.historical);
        })
        .catch(err => console.error("Error loading dashboard data:", err));
}

function loadAIInsights(month) {
    const loader = document.getElementById('insights-loading');
    const container = document.getElementById('insights-container');
    const fallbackBadge = document.getElementById('fallback-badge-container');
    
    // Display loader and hide insights list
    loader.classList.remove('d-none');
    container.classList.add('d-none');
    fallbackBadge.classList.add('d-none');
    
    fetch(`/api/insights?month=${month}`)
        .then(res => res.json())
        .then(data => {
            loader.classList.add('d-none');
            container.classList.remove('d-none');
            
            // Toggle local fallback warning banner
            if (data.is_fallback) {
                fallbackBadge.classList.remove('d-none');
            }
            
            // Populate bullet list
            container.innerHTML = "";
            if (data.insights && data.insights.length > 0) {
                data.insights.forEach(insight => {
                    const div = document.createElement('div');
                    div.className = "insight-item";
                    
                    // Basic parsing if insights have leading bullet characters
                    let cleanText = insight.trim();
                    
                    div.innerHTML = cleanText;
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = "<div class='text-secondary py-2'>No insights could be generated for this range.</div>";
            }
        })
        .catch(err => {
            console.error("Error loading insights:", err);
            loader.classList.add('d-none');
            container.classList.remove('d-none');
            container.innerHTML = "<div class='text-danger py-2'><i class='fa-solid fa-triangle-exclamation me-1'></i> Failed to load financial insights.</div>";
        });
}

function renderCategoryChart(breakdown) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const noDataText = document.getElementById('no-chart-data');
    const canvasEl = document.getElementById('categoryChart');
    
    // Check if there is any expense recorded
    const categories = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const totalExpense = values.reduce((sum, val) => sum + val, 0);
    
    if (totalExpense === 0) {
        canvasEl.classList.add('d-none');
        noDataText.classList.remove('d-none');
        return;
    }
    
    canvasEl.classList.remove('d-none');
    noDataText.classList.add('d-none');
    
    const colors = {
        'Food': '#f59e0b',          // Amber
        'Travel': '#3b82f6',        // Blue
        'Rent': '#8b5cf6',          // Violet/Purple
        'Shopping': '#ec4899',      // Pink
        'Entertainment': '#06b6d4'  // Cyan
    };
    
    const backgroundColors = categories.map(cat => colors[cat] || '#94a3b8');
    
    if (categoryChartInstance) {
        // Update existing chart instance
        categoryChartInstance.data.labels = categories;
        categoryChartInstance.data.datasets[0].data = values;
        categoryChartInstance.data.datasets[0].backgroundColor = backgroundColors;
        categoryChartInstance.update();
    } else {
        // Create new chart instance
        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: 'rgba(9, 9, 14, 0.95)',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                cutout: '68%'
            }
        });
    }
}

function renderHistoryChart(historyList) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    const labels = historyList.map(h => {
        // Format YYYY-MM to readable short date (e.g. May 2026)
        const [year, month] = h.month.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    const incomeData = historyList.map(h => h.income);
    const expenseData = historyList.map(h => h.expense);
    
    if (historyChartInstance) {
        historyChartInstance.data.labels = labels;
        historyChartInstance.data.datasets[0].data = incomeData;
        historyChartInstance.data.datasets[1].data = expenseData;
        historyChartInstance.update();
    } else {
        historyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: 'rgba(244, 63, 94, 0.75)',
                        borderColor: '#f43f5e',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Space Grotesk', size: 11 },
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }
}


// ==========================================
// 2. LEDGER / TRANSACTION PAGE CONTROLLER
// ==========================================

let allTransactionsList = [];

function initTransactionsLedger() {
    // Set default add date to today
    document.getElementById('add-date').value = getTodayDateString();
    
    // Initial load
    fetchTransactions();
    
    // Wire filter listeners
    document.getElementById('filter-type').addEventListener('change', filterAndRenderLedger);
    document.getElementById('filter-category').addEventListener('change', filterAndRenderLedger);
    
    // Wire reset button
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-type').value = "";
        document.getElementById('filter-category').value = "";
        filterAndRenderLedger();
    });
    
    // Wire Add Form
    document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);
    
    // Wire Edit Form
    document.getElementById('edit-transaction-form').addEventListener('submit', handleEditTransaction);
    
    // Wire Delete Confirm Action
    document.getElementById('btn-confirm-delete').addEventListener('click', executeDeleteTransaction);
}

function fetchTransactions() {
    fetch('/api/transactions')
        .then(res => res.json())
        .then(data => {
            allTransactionsList = data;
            filterAndRenderLedger();
        })
        .catch(err => console.error("Error loading transactions:", err));
}

function filterAndRenderLedger() {
    const selectedType = document.getElementById('filter-type').value;
    const selectedCategory = document.getElementById('filter-category').value;
    
    // Filter locally based on controls
    const filtered = allTransactionsList.filter(tx => {
        const matchesType = !selectedType || tx.type === selectedType;
        const matchesCategory = !selectedCategory || tx.category === selectedCategory;
        return matchesType && matchesCategory;
    });
    
    renderTransactionsTable(filtered);
}

function renderTransactionsTable(transactions) {
    const tableBody = document.getElementById('transactions-table-body');
    const emptyState = document.getElementById('table-empty-state');
    
    tableBody.innerHTML = "";
    
    if (transactions.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        
        // 1. Format date nicely (YYYY-MM-DD -> Dec 20, 2026)
        const dateObj = new Date(tx.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // 2. Type badge and class representation
        const typeMarkup = tx.type === 'income' 
            ? `<span class="text-income"><i class="fa-solid fa-circle-arrow-down me-1"></i> Income</span>`
            : `<span class="text-expense"><i class="fa-solid fa-circle-arrow-up me-1"></i> Expense</span>`;
            
        // 3. Category badge mapping
        const categoryBadge = `<span class="badge-category ${tx.category}">
            ${getCategoryIcon(tx.category)} ${tx.category}
        </span>`;
        
        // 4. Description helper
        const descMarkup = tx.description ? tx.description : `<span class="text-muted font-italic">No details</span>`;
        
        // 5. Amount colored representation
        const amountClass = tx.type === 'income' ? 'text-income' : 'text-expense';
        const amountPrefix = tx.type === 'income' ? '+' : '-';
        const amountMarkup = `<span class="font-space-grotesk ${amountClass} fw-bold">${amountPrefix}${formatCurrency(tx.amount)}</span>`;
        
        // 6. Action buttons
        const actionMarkup = `
            <div class="d-flex justify-content-center gap-2">
                <button class="btn btn-sm btn-secondary-custom rounded-circle p-1.5" style="width:32px; height:32px;" onclick="openEditModal(${tx.id})" title="Edit Transaction">
                    <i class="fa-solid fa-pencil" style="font-size:0.8rem;"></i>
                </button>
                <button class="btn btn-sm btn-secondary-custom rounded-circle p-1.5" style="width:32px; height:32px; color:#f43f5e;" onclick="openDeleteModal(${tx.id})" title="Delete Transaction">
                    <i class="fa-solid fa-trash-can" style="font-size:0.8rem;"></i>
                </button>
            </div>
        `;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${typeMarkup}</td>
            <td>${categoryBadge}</td>
            <td>${descMarkup}</td>
            <td class="text-end">${amountMarkup}</td>
            <td>${actionMarkup}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function getCategoryIcon(category) {
    switch (category) {
        case 'Food': return '<i class="fa-solid fa-utensils"></i>';
        case 'Travel': return '<i class="fa-solid fa-plane"></i>';
        case 'Rent': return '<i class="fa-solid fa-house-chimney"></i>';
        case 'Shopping': return '<i class="fa-solid fa-bag-shopping"></i>';
        case 'Entertainment': return '<i class="fa-solid fa-clapperboard"></i>';
        default: return '<i class="fa-solid fa-receipt"></i>';
    }
}


// --- Form Submissions (Add, Edit, Delete API triggers) ---

function handleAddTransaction(e) {
    e.preventDefault();
    
    const form = e.target;
    const errorsDiv = document.getElementById('add-form-errors');
    errorsDiv.classList.add('d-none');
    
    const payload = {
        type: form.type.value,
        amount: parseFloat(form.amount.value),
        category: form.category.value,
        date: form.date.value,
        description: form.description.value
    };
    
    fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            // Success: reset form, dismiss modal, reload records
            form.reset();
            document.getElementById('add-date').value = getTodayDateString();
            
            const modalEl = document.getElementById('addTransactionModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            fetchTransactions();
        } else {
            // Display errors
            if (data.errors) {
                errorsDiv.innerHTML = Object.values(data.errors).join('<br>');
            } else {
                errorsDiv.innerText = data.error || "An error occurred while adding the record.";
            }
            errorsDiv.classList.remove('d-none');
        }
    })
    .catch(err => {
        console.error("Add transaction error:", err);
        errorsDiv.innerText = "Connection lost. Please try again.";
        errorsDiv.classList.remove('d-none');
    });
}

// Global variable to track the active ID being deleted
let transactionIdToDelete = null;

function openDeleteModal(id) {
    const tx = allTransactionsList.find(t => t.id === id);
    if (!tx) return;
    
    transactionIdToDelete = id;
    
    // Display descriptive text in modal
    document.getElementById('delete-details-desc').innerText = tx.description || `${tx.category} Expense`;
    const prefix = tx.type === 'income' ? '+' : '-';
    const classCol = tx.type === 'income' ? 'text-income' : 'text-expense';
    document.getElementById('delete-details-amount').className = `font-space-grotesk fs-5 d-block mt-1 ${classCol} fw-bold`;
    document.getElementById('delete-details-amount').innerText = `${prefix}${formatCurrency(tx.amount)}`;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deleteTransactionModal'));
    modal.show();
}

function executeDeleteTransaction() {
    if (!transactionIdToDelete) return;
    
    fetch(`/api/transactions/${transactionIdToDelete}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (res.ok) {
            const modalEl = document.getElementById('deleteTransactionModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            fetchTransactions();
        } else {
            alert("Failed to delete transaction.");
        }
    })
    .catch(err => console.error("Delete error:", err))
    .finally(() => {
        transactionIdToDelete = null;
    });
}

function openEditModal(id) {
    const tx = allTransactionsList.find(t => t.id === id);
    if (!tx) return;
    
    // Populate inputs in edit form
    document.getElementById('edit-id').value = tx.id;
    document.getElementById('edit-type').value = tx.type;
    document.getElementById('edit-amount').value = tx.amount;
    document.getElementById('edit-category').value = tx.category;
    document.getElementById('edit-date').value = tx.date;
    document.getElementById('edit-description').value = tx.description || '';
    
    // Reset any previous errors
    document.getElementById('edit-form-errors').classList.add('d-none');
    
    // Show edit modal
    const modal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
    modal.show();
}

function handleEditTransaction(e) {
    e.preventDefault();
    
    const form = e.target;
    const id = document.getElementById('edit-id').value;
    const errorsDiv = document.getElementById('edit-form-errors');
    errorsDiv.classList.add('d-none');
    
    const payload = {
        type: form.type.value,
        amount: parseFloat(form.amount.value),
        category: form.category.value,
        date: form.date.value,
        description: form.description.value
    };
    
    fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            // Success: hide modal, reload table
            const modalEl = document.getElementById('editTransactionModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            fetchTransactions();
        } else {
            // Display errors
            if (data.errors) {
                errorsDiv.innerHTML = Object.values(data.errors).join('<br>');
            } else {
                errorsDiv.innerText = data.error || "An error occurred while updating the record.";
            }
            errorsDiv.classList.remove('d-none');
        }
    })
    .catch(err => {
        console.error("Edit transaction error:", err);
        errorsDiv.innerText = "Connection lost. Please try again.";
        errorsDiv.classList.remove('d-none');
    });
}
