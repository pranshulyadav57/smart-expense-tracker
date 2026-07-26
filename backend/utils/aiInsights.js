const logger = require("./logger");
const openaiEnabled = Boolean(process.env.OPENAI_API_KEY);
let openaiClient = null;

if (openaiEnabled) {
  try {
    const { OpenAI } = require("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (err) {
    logger.warn("OpenAI package unavailable. Using built-in AI heuristics instead.");
    openaiClient = null;
  }
}

const safeNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) => {
  const amount = safeNumber(value);
  return `₹${amount.toFixed(2)}`;
};

const buildCategoryBreakdown = (expenses = []) => {
  const categoryMap = {};

  expenses.forEach((expense) => {
    const category = expense.category || "Other";
    categoryMap[category] = (categoryMap[category] || 0) + safeNumber(expense.amount);
  });

  const total = Object.values(categoryMap).reduce((sum, value) => sum + value, 0);

  return Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
      share: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0
    }));
};

const buildDailyTrend = (expenses = []) => {
  const today = new Date();
  const lastSevenDays = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(today);
    date.setDate(date.getDate() - idx);
    return date.toISOString().split("T")[0];
  }).reverse();

  const trendMap = lastSevenDays.reduce((acc, day) => {
    acc[day] = 0;
    return acc;
  }, {});

  expenses.forEach((expense) => {
    const date = (expense.date || expense.created_at || expense.createdAt || "").toString().split("T")[0];
    if (date && date in trendMap) {
      trendMap[date] += safeNumber(expense.amount);
    }
  });

  return lastSevenDays.map((day) => ({ date: day, amount: trendMap[day] || 0 }));
};

const getSpendingScore = (totalSpend, budgetLimit = 0) => {
  if (budgetLimit <= 0) return 50;
  const ratio = totalSpend / budgetLimit;
  if (ratio <= 0.5) return 90;
  if (ratio <= 0.8) return 75;
  if (ratio <= 1.0) return 55;
  return 30;
};

const predictNextMonth = (expenses = []) => {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {
      predictedSpend: 0,
      trend: "Not enough data to generate a prediction"
    };
  }

  const monthlyTotals = expenses.reduce((acc, expense) => {
    const createdAt = new Date(expense.date || expense.created_at || expense.createdAt || Date.now());
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
    acc[key] = (acc[key] || 0) + safeNumber(expense.amount);
    return acc;
  }, {});

  const months = Object.entries(monthlyTotals)
    .sort(([a], [b]) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return ay === by ? am - bm : ay - by;
    })
    .map(([, total]) => total);

  if (months.length < 2) {
    return {
      predictedSpend: Number((months[0] || 0).toFixed(2)),
      trend: "Insufficient month-to-month history for strong forecasting"
    };
  }

  const diffs = months.slice(1).map((value, index) => value - months[index]);
  const averageDelta = diffs.reduce((sum, delta) => sum + delta, 0) / diffs.length;
  const predictedSpend = Math.max(0, (months[months.length - 1] || 0) + averageDelta);

  return {
    predictedSpend: Number(predictedSpend.toFixed(2)),
    trend: averageDelta >= 0 ? "Spending is trending higher" : "Spending is trending lower"
  };
};

const tryOpenAI = async (prompt) => {
  if (!openaiClient) return null;

  try {
    // Use the correct chat completion endpoint and a highly cost-effective model
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise financial advisor." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150, // Prevent runaway token overflow/costs
      temperature: 0.7
    });

    const text = response.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  } catch (err) {
    logger.warn("OpenAI request failed", { error: err?.message || err });
    return null;
  }
};

exports.generateStudentInsights = async ({ expenses = [], budgetLimit = 0 }) => {
  const normalizedExpenses = Array.isArray(expenses) ? expenses.map((item) => ({
    amount: safeNumber(item.amount),
    category: item.category || "Other",
    date: item.date || item.created_at || item.createdAt || new Date().toISOString()
  })) : [];

  const totalSpend = normalizedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryBreakdown = buildCategoryBreakdown(normalizedExpenses);
  const dailyTrend = buildDailyTrend(normalizedExpenses);
  const healthScore = getSpendingScore(totalSpend, budgetLimit);
  const prediction = predictNextMonth(normalizedExpenses);

  const insights = [
    {
      title: "Spending Overview",
      message: `You spent ${formatCurrency(totalSpend)} in the current period.`
    },
    {
      title: "Budget Status",
      message: budgetLimit > 0
        ? `Your budget is ${formatCurrency(budgetLimit)}. Current usage is ${healthScore}%.`
        : "No monthly budget is set yet. Add a budget to track your spending effectively."
    },
    {
      title: "Forecast",
      message: `Next month is projected to be ${formatCurrency(prediction.predictedSpend)}. ${prediction.trend}.`
    }
  ];

  if (categoryBreakdown.length > 0) {
    const top = categoryBreakdown[0];
    insights.push({
      title: "Top Category",
      message: `Highest spend in ${top.category} at ${formatCurrency(top.amount)} (${top.share}%).`
    });
  }

  if (healthScore <= 55) {
    insights.push({
      title: "Warning",
      message: "Your spending is very close to or above budget. Consider reducing discretionary purchases."
    });
  } else if (healthScore <= 75) {
    insights.push({
      title: "Caution",
      message: "You're using a moderate portion of your budget. Keep track of daily spend to avoid surprises."
    });
  } else {
    insights.push({
      title: "Good Control",
      message: "Spending is under control. Maintain this pace to meet your savings goals."
    });
  }

  if (budgetLimit > 0 && totalSpend > budgetLimit * 0.8) {
    insights.push({
      title: "Budget Alert",
      message: `You've used ${Math.round((totalSpend / budgetLimit) * 100)}% of your budget.`
    });
  }

  const report = {
    summary: {
      totalSpend: Number(totalSpend.toFixed(2)),
      budgetLimit: Number(budgetLimit.toFixed(2)),
      healthScore,
      predictedSpend: prediction.predictedSpend
    },
    breakdown: categoryBreakdown,
    dailyTrend,
    insights
  };

  if (openaiClient) {
    const prompt = `Create a 2-sentence actionable financial insight for a student. Total spent: ${formatCurrency(totalSpend)}. Budget: ${formatCurrency(budgetLimit)}. Top category: ${categoryBreakdown[0]?.category || 'None'}. Predicted next month: ${formatCurrency(prediction.predictedSpend)}.`;
    const external = await tryOpenAI(prompt);
    if (external) {
      report.modelSummary = external;
    }
  }

  return report;
};

exports.generateBusinessInsights = async ({ customers = [], transactions = [], stats = {} }) => {
  const totalOutstanding = safeNumber(stats.total_outstanding);
  const totalCustomers = safeNumber(stats.total_customers);
  const activeCustomers = customers.filter((customer) => customer.is_active).length;
  const pendingCustomers = customers.filter((customer) => safeNumber(customer.current_balance) > 0).length;
  const topOwingCustomers = customers
    .filter((customer) => safeNumber(customer.current_balance) > 0)
    .sort((a, b) => safeNumber(b.current_balance) - safeNumber(a.current_balance))
    .slice(0, 3)
    .map((customer) => ({
      name: customer.name,
      balance: Number(safeNumber(customer.current_balance).toFixed(2))
    }));

  const transactionsLast30 = transactions.filter((tx) => {
    const txDate = new Date(tx.date || tx.created_at || tx.createdAt);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return txDate >= cutoff;
  });

  const credits = transactionsLast30.filter((tx) => tx.type === "credit").reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
  const debits = transactionsLast30.filter((tx) => tx.type === "debit").reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
  const netCashflow = credits - debits;

  const insights = [
    {
      title: "Outstanding Balance",
      message: `Total pending customer balance is ${formatCurrency(totalOutstanding)} across ${pendingCustomers} customers.`
    },
    {
      title: "Customer Activity",
      message: `${activeCustomers} active customers are contributing to your ledger performance.`
    },
    {
      title: "Recent Cashflow",
      message: `Net cashflow over the last 30 days is ${formatCurrency(netCashflow)}.`
    }
  ];

  if (topOwingCustomers.length > 0) {
    insights.push({
      title: "Top Accounts to Recover",
      message: `Focus on ${topOwingCustomers.map((item) => `${item.name} (${formatCurrency(item.balance)})`).join(", ")}.`
    });
  }

  if (netCashflow < 0) {
    insights.push({
      title: "Recovery Notice",
      message: "Your recent cashflow is negative. Prioritize collection and follow up with overdue customers."
    });
  } else {
    insights.push({
      title: "Healthy Cashflow",
      message: "Your business is generating positive net cashflow. Keep momentum with timely collections."
    });
  }

  const report = {
    summary: {
      totalCustomers,
      totalOutstanding,
      averageBalance: Number(safeNumber(stats.average_balance).toFixed(2)),
      netCashflow: Number(netCashflow.toFixed(2))
    },
    topOwingCustomers,
    insights
  };

  if (openaiClient) {
    const prompt = `Create a 2-sentence actionable financial insight for a business ledger: ${totalCustomers} customers (${pendingCustomers} with pending balances). Total outstanding: ${formatCurrency(totalOutstanding)}. Net cashflow (30 days): ${formatCurrency(netCashflow)}.`;
    const external = await tryOpenAI(prompt);
    if (external) {
      report.modelSummary = external;
    }
  }

  return report;
};

exports.getInsights = async (rows) => {
  const expenses = Array.isArray(rows) ? rows : [];
  const report = await exports.generateStudentInsights({ expenses, budgetLimit: 0 });
  return report.insights || [];
};
