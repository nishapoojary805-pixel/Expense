
// =====================================
// GOLDTRACK - DAILY EXPENSE TRACKER
// =====================================

// Load saved data
let transactions = JSON.parse(
    localStorage.getItem("transactions") || "[]"
);

let budget = Number(localStorage.getItem("budget")) || 0;

let editingId = null;

let categoryChart = null;
let monthlyChart = null;


// =====================================
// HELPER FUNCTIONS
// =====================================

const $ = id => document.getElementById(id);

function saveData() {
    localStorage.setItem(
        "transactions",
        JSON.stringify(transactions)
    );

    localStorage.setItem("budget", budget);
}

function money(amount) {
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    });
}

function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function currentMonth(date) {
    return date.slice(0, 7);
}


// =====================================
// DISPLAY TODAY'S DATE
// =====================================

$("today").textContent = new Date().toLocaleDateString(
    "en-IN",
    {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }
);

$("date").value = localDate();


// =====================================
// ADD OR EDIT TRANSACTION
// =====================================

$("transactionForm").addEventListener("submit", function(event) {

    event.preventDefault();

    const description = $("description").value.trim();
    const amount = Number($("amount").value);
    const type = $("type").value;
    const category = $("category").value;
    const date = $("date").value;

    if (!description || amount <= 0 || !Number.isFinite(amount) || !date) {
        alert("Please enter valid transaction details.");
        return;
    }

    const transaction = {
        id: editingId ?? (
            window.crypto?.randomUUID?.() ||
            Date.now().toString() + Math.random()
        ),
        description,
        amount,
        type,
        category,
        date
    };

    if (editingId !== null) {

        transactions = transactions.map(item =>
            item.id === editingId ? transaction : item
        );

        editingId = null;

    } else {

        transactions.push(transaction);

    }

    saveData();

    $("transactionForm").reset();
    $("date").value = localDate();

    $("submitBtn").textContent = "+ Add Transaction";
    $("cancelEdit").classList.add("hidden");

    updateDashboard();
});


// =====================================
// UPDATE DASHBOARD
// =====================================

function updateDashboard() {

    let totalIncome = 0;
    let totalExpenses = 0;
    let todayExpenses = 0;

    const today = localDate();

    transactions.forEach(item => {

        if (item.type === "income") {
            totalIncome += item.amount;
        }

        if (item.type === "expense") {
            totalExpenses += item.amount;

            if (item.date === today) {
                todayExpenses += item.amount;
            }
        }

    });

    const balance = totalIncome - totalExpenses;

    $("balance").textContent = money(balance);
    $("income").textContent = money(totalIncome);
    $("expenses").textContent = money(totalExpenses);
    $("todayExpense").textContent = money(todayExpenses);

    updateBudget();
    displayTransactions();
    updateCharts();
}


// =====================================
// MONTHLY BUDGET
// =====================================

function setBudget() {

    const value = Number($("budgetInput").value);

    if (!Number.isFinite(value) || value <= 0) {
        alert("Please enter a valid budget.");
        return;
    }

    budget = value;

    saveData();

    $("budgetInput").value = "";

    updateBudget();
}

function updateBudget() {

    const month = currentMonth(localDate());

    const monthlyExpenses = transactions
        .filter(item =>
            item.type === "expense" &&
            currentMonth(item.date) === month
        )
        .reduce((sum, item) => sum + item.amount, 0);

    $("budgetSpent").textContent = money(monthlyExpenses);

    let percentage = budget > 0
        ? (monthlyExpenses / budget) * 100
        : 0;

    $("budgetProgress").style.width =
        Math.min(percentage, 100) + "%";

    if (budget === 0) {

        $("budgetMessage").textContent =
            "Set a budget to start tracking.";

    } else if (percentage > 100) {

        $("budgetMessage").textContent =
            "Budget exceeded by " + money(monthlyExpenses - budget);

        $("budgetProgress").style.background = "#e16d6d";

    } else {

        $("budgetMessage").textContent =
            money(budget - monthlyExpenses) +
            " remaining (" + percentage.toFixed(1) + "% used)";

        $("budgetProgress").style.background = "#d4af37";

    }
}


// =====================================
// DISPLAY TRANSACTIONS
// =====================================

function displayTransactions() {

    const list = $("transactionList");

    list.innerHTML = "";

    const search = $("search").value.toLowerCase();
    const typeFilter = $("filterType").value;
    const categoryFilter = $("filterCategory").value;

    const filtered = transactions
        .filter(item => {

            const matchesSearch =
                item.description.toLowerCase().includes(search) ||
                item.category.toLowerCase().includes(search);

            const matchesType =
                typeFilter === "all" || item.type === typeFilter;

            const matchesCategory =
                categoryFilter === "all" ||
                item.category === categoryFilter;

            return matchesSearch &&
                matchesType &&
                matchesCategory;

        })
        .sort((a, b) =>
            b.date.localeCompare(a.date) ||
            String(b.id).localeCompare(String(a.id))
        );

    $("emptyMessage").style.display =
        filtered.length === 0 ? "block" : "none";

    filtered.forEach(item => {

        const row = document.createElement("tr");

        const description = document.createElement("td");
        description.textContent = item.description;

        const category = document.createElement("td");
        category.textContent = item.category;

        const date = document.createElement("td");
        date.textContent = item.date;

        const type = document.createElement("td");
        type.textContent = item.type;
        type.className = item.type === "income"
            ? "type-income"
            : "type-expense";

        const amount = document.createElement("td");
        amount.textContent =
            (item.type === "income" ? "+ " : "- ") +
            money(item.amount);

        amount.className = item.type === "income"
            ? "amount-income"
            : "amount-expense";

        const actions = document.createElement("td");
        const actionBox = document.createElement("div");
        actionBox.className = "action-buttons";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";
        editButton.addEventListener("click", () => editTransaction(item.id));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.addEventListener("click", () => deleteTransaction(item.id));

        actionBox.append(editButton, deleteButton);
        actions.appendChild(actionBox);

        row.append(
            description,
            category,
            date,
            type,
            amount,
            actions
        );

        list.appendChild(row);

    });
}


// =====================================
// EDIT TRANSACTION
// =====================================

function editTransaction(id) {

    const item = transactions.find(t => t.id === id);

    if (!item) return;

    editingId = id;

    $("description").value = item.description;
    $("amount").value = item.amount;
    $("type").value = item.type;
    $("category").value = item.category;
    $("date").value = item.date;

    $("submitBtn").textContent = "Update Transaction";
    $("cancelEdit").classList.remove("hidden");

    $("transactionForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// =====================================
// CANCEL EDIT
// =====================================

function cancelEditing() {

    editingId = null;

    $("transactionForm").reset();

    $("date").value = localDate();

    $("submitBtn").textContent = "+ Add Transaction";

    $("cancelEdit").classList.add("hidden");
}


// =====================================
// DELETE TRANSACTION
// =====================================

function deleteTransaction(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmDelete) return;

    transactions = transactions.filter(
        item => item.id !== id
    );

    if (editingId === id) {
        cancelEditing();
    }

    saveData();

    updateDashboard();
}


// =====================================
// SEARCH AND FILTER
// =====================================

$("search").addEventListener("input", displayTransactions);

$("filterType").addEventListener("change", displayTransactions);

$("filterCategory").addEventListener("change", displayTransactions);


// =====================================
// CATEGORY EXPENSE CHART
// =====================================

function updateCharts() {

    const categories = {};

    transactions.forEach(item => {

        if (item.type === "expense") {

            categories[item.category] =
                (categories[item.category] || 0) + item.amount;

        }

    });

    const categoryLabels = Object.keys(categories);
    const categoryValues = Object.values(categories);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart($("categoryChart"), {

        type: "doughnut",

        data: {
            labels: categoryLabels,

            datasets: [{
                data: categoryValues,

                backgroundColor: [
                    "#d4af37",
                    "#b8860b",
                    "#f3d779",
                    "#8c6c20",
                    "#6f5724",
                    "#a88c4c",
                    "#e6c76a",
                    "#777777",
                    "#9d8141"
                ],

                borderWidth: 2,
                borderColor: "#1a1a1a"
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#eeeeee",
                        padding: 15
                    }
                }
            }
        }

    });


    // =================================
    // MONTHLY INCOME AND EXPENSE CHART
    // =================================

    const monthLabels = [];
    const incomeData = [];
    const expenseData = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {

        const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

        const key =
            date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0");

        monthLabels.push(
            date.toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit"
            })
        );

        const monthIncome = transactions
            .filter(item =>
                item.type === "income" &&
                currentMonth(item.date) === key
            )
            .reduce((sum, item) => sum + item.amount, 0);

        const monthExpense = transactions
            .filter(item =>
                item.type === "expense" &&
                currentMonth(item.date) === key
            )
            .reduce((sum, item) => sum + item.amount, 0);

        incomeData.push(monthIncome);
        expenseData.push(monthExpense);

    }

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart($("monthlyChart"), {

        type: "bar",

        data: {
            labels: monthLabels,

            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    backgroundColor: "#d4af37",
                    borderRadius: 5
                },

                {
                    label: "Expenses",
                    data: expenseData,
                    backgroundColor: "#a65353",
                    borderRadius: 5
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            scales: {
                x: {
                    ticks: {
                        color: "#cccccc"
                    },
                    grid: {
                        color: "#303030"
                    }
                },

                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#cccccc",
                        callback: value => "₹" + value.toLocaleString("en-IN")
                    },
                    grid: {
                        color: "#303030"
                    }
                }
            },

            plugins: {
                legend: {
                    labels: {
                        color: "#eeeeee"
                    }
                }
            }
        }

    });

}


// =====================================
// INITIALIZE APPLICATION
// =====================================

updateDashboard();
