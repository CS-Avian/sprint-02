const $ = id => document.getElementById(id);

const salaryForm = $("salaryForm");
const salaryInput = $("salaryInput");
const salaryDisplay = $("salaryDisplay");
const salaryMessage = $("salaryMessage");

const expenseForm = $("expenseForm");
const expenseName = $("expenseName");
const expenseAmount = $("expenseAmount");
const expenseMessage = $("expenseMessage");

const expenseDisplay = $("expenseDisplay");
const balanceDisplay = $("balanceDisplay");
const expenseList = $("expenseList");
const emptyState = $("emptyState");
const expenseCount = $("expenseCount");
const chartNote = $("chartNote");

const STORAGE_KEY = "cashFlowTrackerData";

let salary = 0;
let expenses = [];
let expenseChart = null;

const money = amount => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
}).format(amount);

function showMessage(element, message = "") {
    element.textContent = message;
}

function saveData() {
    const data = { salary, expenses };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return;
        }

        const data = JSON.parse(savedData);

        if (
            typeof data.salary === "number" &&
            Number.isFinite(data.salary) &&
            data.salary >= 0 &&
            Array.isArray(data.expenses)
        ) {
            salary = data.salary;
            expenses = data.expenses.filter(expense =>
                expense &&
                typeof expense.id === "string" &&
                typeof expense.name === "string" &&
                expense.name.trim() !== "" &&
                typeof expense.amount === "number" &&
                Number.isFinite(expense.amount) &&
                expense.amount >= 0
            );
        }
    } catch (error) {
        console.error("Could not load saved Cash-Flow data:", error);
        salary = 0;
        expenses = [];
    }
}

function getTotalExpenses() {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function renderSummary() {
    const totalExpenses = getTotalExpenses();
    const remainingBalance = salary - totalExpenses;

    salaryDisplay.textContent = money(salary);
    expenseDisplay.textContent = money(totalExpenses);
    balanceDisplay.textContent = money(remainingBalance);

    balanceDisplay.classList.toggle("negative-balance", remainingBalance < 0);
    chartNote.textContent = salary === 0 && totalExpenses === 0
        ? "Add a salary and expenses to see your breakdown."
        : remainingBalance < 0
            ? "Expenses are higher than your salary."
            : "Your balance updates whenever you add or remove an expense.";
}

function renderExpenses() {
    expenseList.replaceChildren();
    emptyState.hidden = expenses.length > 0;

    expenseCount.textContent = `${expenses.length} ${expenses.length === 1 ? "item" : "items"}`;

    expenses.forEach(expense => {
        const item = document.createElement("li");
        item.className = "expense-item";

        const info = document.createElement("div");
        info.className = "expense-info";

        const name = document.createElement("p");
        name.className = "expense-name";
        name.textContent = expense.name;

        const date = document.createElement("p");
        date.className = "expense-date";
        date.textContent = expense.date || "Expense";

        const right = document.createElement("div");
        right.className = "expense-right";

        const amount = document.createElement("span");
        amount.className = "expense-amount";
        amount.textContent = `− ${money(expense.amount)}`;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", `Delete ${expense.name}`);
        deleteButton.title = "Delete expense";
        deleteButton.addEventListener("click", () => deleteExpense(expense.id));

        info.append(name, date);
        right.append(amount, deleteButton);
        item.append(info, right);
        expenseList.append(item);
    });
}

function renderChart() {
    if (typeof Chart === "undefined") {
        chartNote.textContent = "Chart.js could not load. Check your internet connection.";
        return;
    }

    const totalExpenses = getTotalExpenses();
    const remainingBalance = Math.max(salary - totalExpenses, 0);
    const canvas = $("expenseChart");

    if (expenseChart) {
        expenseChart.data.datasets[0].data = [remainingBalance, totalExpenses];
        expenseChart.update();
        return;
    }

    expenseChart = new Chart(canvas, {
        type: "pie",
        data: {
            labels: ["Remaining Balance", "Total Expenses"],
            datasets: [{
                data: [remainingBalance, totalExpenses],
                backgroundColor: ["#5267e8", "#f0a06f"],
                borderColor: ["#ffffff", "#ffffff"],
                borderWidth: 4,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${money(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderApp() {
    renderSummary();
    renderExpenses();
    renderChart();
}

function deleteExpense(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    saveData();
    renderApp();
}

salaryForm.addEventListener("submit", event => {
    event.preventDefault();
    showMessage(salaryMessage);

    const rawSalary = salaryInput.value.trim();
    const amount = Number(rawSalary);

    if (rawSalary === "") {
        showMessage(salaryMessage, "Please enter your salary.");
        salaryInput.focus();
        return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
        showMessage(salaryMessage, "Salary must be a valid non-negative number.");
        salaryInput.focus();
        return;
    }

    salary = amount;
    saveData();
    renderApp();
    showMessage(salaryMessage, "Salary saved successfully.");
    salaryInput.value = "";
});

expenseForm.addEventListener("submit", event => {
    event.preventDefault();
    showMessage(expenseMessage);

    const name = expenseName.value.trim();
    const rawAmount = expenseAmount.value.trim();
    const amount = Number(rawAmount);

    if (!name) {
        showMessage(expenseMessage, "Please enter an expense name.");
        expenseName.focus();
        return;
    }

    if (rawAmount === "") {
        showMessage(expenseMessage, "Please enter an expense amount.");
        expenseAmount.focus();
        return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
        showMessage(expenseMessage, "Amount must be a valid non-negative number.");
        expenseAmount.focus();
        return;
    }

    expenses.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        amount,
        date: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })
    });

    saveData();
    renderApp();
    expenseForm.reset();
    showMessage(expenseMessage, "Expense added successfully.");
    expenseName.focus();
});

$("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
});

loadData();
renderApp();
