let currentMonth = 'January';
let budgetData = {};
let chart = null;
let savingsGoal = 0;

// Investment categories that should be counted as investments
const investmentKeywords = ['investment', 'savings', 'fund', 'sip', 'mutual', 'stock'];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
    updateDisplay();
});

function setupEventListeners() {
    // Month selector
    document.querySelectorAll('.month-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.month-btn.active').classList.remove('active');
            this.classList.add('active');
            currentMonth = this.dataset.month;
            updateDisplay();
        });
    });

    // Salary input
    document.getElementById('salary').addEventListener('input', function() {
        saveData();
        updateDisplay();
    });

    // Category inputs
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('category-name') || e.target.classList.contains('category-amount')) {
            saveData();
            updateDisplay();
        }
    });
}

function addCategory() {
    const categoriesContainer = document.getElementById('categories');
    const categoryItem = document.createElement('div');
    categoryItem.className = 'category-item';
    categoryItem.innerHTML = `
        <input type="text" placeholder="Category name" class="category-name" style="flex: 1; margin-right: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        <input type="number" placeholder="0" class="category-amount" style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;" min="0">
        <button class="remove-category" onclick="removeCategory(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    categoriesContainer.appendChild(categoryItem);
    
    // Add event listeners to new inputs
    categoryItem.querySelector('.category-name').addEventListener('input', function() {
        saveData();
        updateDisplay();
    });
    categoryItem.querySelector('.category-amount').addEventListener('input', function() {
        saveData();
        updateDisplay();
    });
}

function removeCategory(button) {
    if (document.querySelectorAll('.category-item').length > 1) {
        button.parentElement.remove();
        saveData();
        updateDisplay();
    } else {
        alert('You must have at least one category!');
    }
}

function saveData() {
    if (!budgetData[currentMonth]) {
        budgetData[currentMonth] = {};
    }

    budgetData[currentMonth].salary = parseFloat(document.getElementById('salary').value) || 0;
    budgetData[currentMonth].categories = [];

    document.querySelectorAll('.category-item').forEach(item => {
        const name = item.querySelector('.category-name').value || 'Unnamed Category';
        const amount = parseFloat(item.querySelector('.category-amount').value) || 0;
        budgetData[currentMonth].categories.push({ name, amount });
    });

    // Save to localStorage
    try {
        localStorage.setItem('budgetPlannerData', JSON.stringify(budgetData));
        localStorage.setItem('savingsGoal', savingsGoal.toString());
    } catch (e) {
        console.log('localStorage not available, using session storage');
    }
}

function loadData() {
    try {
        const saved = localStorage.getItem('budgetPlannerData');
        const savedGoal = localStorage.getItem('savingsGoal');
        
        if (saved) {
            budgetData = JSON.parse(saved);
        }
        if (savedGoal) {
            savingsGoal = parseFloat(savedGoal);
            document.getElementById('savingsGoal').value = savingsGoal;
        }
    } catch (e) {
        console.log('Could not load data from localStorage');
        budgetData = {};
    }

    // Load current month data
    if (budgetData[currentMonth]) {
        document.getElementById('salary').value = budgetData[currentMonth].salary || '';
        
        // Clear existing categories
        document.getElementById('categories').innerHTML = '';
        
        // Load saved categories
        if (budgetData[currentMonth].categories && budgetData[currentMonth].categories.length > 0) {
            budgetData[currentMonth].categories.forEach(category => {
                addCategoryWithData(category.name, category.amount);
            });
        } else {
            // Add default categories if none exist
            addCategoryWithData('Fixed Expenses', 0);
        }
    }
}

function addCategoryWithData(name, amount) {
    const categoriesContainer = document.getElementById('categories');
    const categoryItem = document.createElement('div');
    categoryItem.className = 'category-item';
    categoryItem.innerHTML = `
        <input type="text" value="${name}" class="category-name" style="flex: 1; margin-right: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        <input type="number" value="${amount}" class="category-amount" style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;" min="0">
        <button class="remove-category" onclick="removeCategory(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    categoriesContainer.appendChild(categoryItem);
    
    // Add event listeners
    categoryItem.querySelector('.category-name').addEventListener('input', function() {
        saveData();
        updateDisplay();
    });
    categoryItem.querySelector('.category-amount').addEventListener('input', function() {
        saveData();
        updateDisplay();
    });
}

function updateDisplay() {
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    let totalExpenses = 0;
    let totalInvestments = 0;
    const categories = [];

    // Calculate totals
    document.querySelectorAll('.category-item').forEach(item => {
        const name = item.querySelector('.category-name').value || 'Unnamed Category';
        const amount = parseFloat(item.querySelector('.category-amount').value) || 0;
        
        if (amount > 0) {
            categories.push({ name, amount });
            totalExpenses += amount;
            
            // Check if this category is an investment
            const isInvestment = investmentKeywords.some(keyword => 
                name.toLowerCase().includes(keyword)
            );
            if (isInvestment) {
                totalInvestments += amount;
            }
        }
    });

    const leftover = salary - totalExpenses;

    // Update summary cards
    document.getElementById('totalIncome').textContent = `₹${salary.toLocaleString('en-IN')}`;
    document.getElementById('totalExpenses').textContent = `₹${totalExpenses.toLocaleString('en-IN')}`;
    document.getElementById('leftover').textContent = `₹${leftover.toLocaleString('en-IN')}`;
    document.getElementById('totalInvestments').textContent = `₹${totalInvestments.toLocaleString('en-IN')}`;

    // Update leftover card color based on positive/negative
    const leftoverCard = document.querySelector('.card-leftover');
    if (leftover < 0) {
        leftoverCard.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
    } else {
        leftoverCard.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    }

    // Update chart
    updateChart(categories);

    // Update savings goal progress
    updateSavingsGoalProgress(totalInvestments);
}

function updateChart(categories) {
    const ctx = document.getElementById('budgetChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    if (categories.length === 0) {
        return;
    }

    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
        '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];

    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories.map(cat => cat.name),
            datasets: [{
                data: categories.map(cat => cat.amount),
                backgroundColor: colors.slice(0, categories.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const percentage = ((value / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                            return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function setSavingsGoal() {
    const goalInput = document.getElementById('savingsGoal');
    savingsGoal = parseFloat(goalInput.value) || 0;
    
    if (savingsGoal > 0) {
        document.getElementById('goalProgress').style.display = 'block';
        updateSavingsGoalProgress();
        saveData();
    } else {
        document.getElementById('goalProgress').style.display = 'none';
    }
}

function updateSavingsGoalProgress(currentSavings = null) {
    if (savingsGoal <= 0) return;

    if (currentSavings === null) {
        currentSavings = 0;
        document.querySelectorAll('.category-item').forEach(item => {
            const name = item.querySelector('.category-name').value || '';
            const amount = parseFloat(item.querySelector('.category-amount').value) || 0;
            
            const isInvestment = investmentKeywords.some(keyword => 
                name.toLowerCase().includes(keywor