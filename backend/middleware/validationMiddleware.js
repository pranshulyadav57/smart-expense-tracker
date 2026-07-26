
// =========================
// VALIDATION MIDDLEWARE
// =========================

const validators = require("../utils/validators");

const { AppError } = require("./errorMiddleware");

/* ======================================================
   REGISTER VALIDATION
====================================================== */

const validateRegistration = (
  req,
  res,
  next
) => {
  try {
    let {
      username,
      email,
      password,
      role,
      business_name,
      monthly_budget,
      phone,
    } = req.body;

    /* =========================================
       NORMALIZE
    ========================================= */

    username = username?.trim();

    email = email?.trim();

    password = password?.trim();

    role = role?.toLowerCase().trim();

    business_name =
      business_name?.trim();

    phone = phone?.trim();

    /* =========================================
       REQUIRED
    ========================================= */

    if (!validators.isRequired(username)) {
      throw new AppError(
        "Username is required",
        400
      );
    }

    if (!validators.isRequired(email)) {
      throw new AppError(
        "Email is required",
        400
      );
    }

    if (!validators.isRequired(password)) {
      throw new AppError(
        "Password is required",
        400
      );
    }

    if (!validators.isRequired(role)) {
      throw new AppError(
        "Role is required",
        400
      );
    }

    /* =========================================
       USERNAME
    ========================================= */

    if (
      !validators.isValidUsername(username)
    ) {
      throw new AppError(
        "Username must be at least 3 characters and contain only letters, numbers, and underscores",
        400
      );
    }

    /* =========================================
       EMAIL
    ========================================= */

    if (!validators.isValidEmail(email)) {
      throw new AppError(
        "Invalid email format",
        400
      );
    }

    /* =========================================
       PASSWORD
    ========================================= */

    // IMPORTANT:
    // Must match frontend validation

    if (password.length < 4) {
      throw new AppError(
        "Password must be at least 4 characters",
        400
      );
    }

    /* =========================================
       ROLE
    ========================================= */

    if (
      !["student", "business"].includes(
        role
      )
    ) {
      throw new AppError(
        "Role must be student or business",
        400
      );
    }

    /* =========================================
       BUSINESS VALIDATION
    ========================================= */

    if (role === "business") {
      if (
        !validators.isRequired(
          business_name
        )
      ) {
        throw new AppError(
          "Business name is required",
          400
        );
      }

      if (!validators.isRequired(phone)) {
        throw new AppError(
          "Phone number is required",
          400
        );
      }

      if (
        !validators.isValidPhone(phone)
      ) {
        throw new AppError(
          "Invalid phone number format",
          400
        );
      }
    }

    /* =========================================
       STUDENT VALIDATION
    ========================================= */

    if (role === "student") {
      if (
        !validators.isRequired(
          monthly_budget
        )
      ) {
        throw new AppError(
          "Monthly budget is required",
          400
        );
      }

      if (
        !validators.isPositiveNumber(
          monthly_budget
        )
      ) {
        throw new AppError(
          "Monthly budget must be a positive number",
          400
        );
      }
    }

    /* =========================================
       SANITIZE REQUEST
    ========================================= */

    req.body = {
      ...req.body,
      username,
      email,
      password,
      role,
      business_name,
      phone,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   LOGIN VALIDATION
====================================================== */

const validateLogin = (
  req,
  res,
  next
) => {
  try {
    let { identifier, password } =
      req.body;

    identifier = identifier?.trim();

    password = password?.trim();

    if (
      !validators.isRequired(identifier)
    ) {
      throw new AppError(
        "Email or username is required",
        400
      );
    }

    if (
      !validators.isRequired(password)
    ) {
      throw new AppError(
        "Password is required",
        400
      );
    }

    if (password.length < 4) {
      throw new AppError(
        "Invalid credentials",
        400
      );
    }

    req.body.identifier = identifier;

    req.body.password = password;

    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   EXPENSE VALIDATION
====================================================== */

const validateExpense = (
  req,
  res,
  next
) => {
  try {
    const { amount, category } =
      req.body;

    if (!validators.isRequired(amount)) {
      throw new AppError(
        "Amount is required",
        400
      );
    }

    if (
      !validators.isValidAmount(amount)
    ) {
      throw new AppError(
        "Amount must be positive",
        400
      );
    }

    if (
      !validators.isRequired(category)
    ) {
      throw new AppError(
        "Category is required",
        400
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   ID PARAM VALIDATION
====================================================== */

const validateIdParam = (req, res, next) => {
  try {
    // Handles /:id, /:customerId, etc.
    const id = req.params.id || req.params.customerId;
    if (!id || !validators.isPositiveNumber(id)) {
      throw new AppError("A valid ID parameter is required.", 400);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   CUSTOMER VALIDATION
====================================================== */

const validateCustomer = (req, res, next) => {
  try {
    const { name } = req.body;
    if (!validators.isRequired(name)) {
      throw new AppError("Customer name is required.", 400);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   TRANSACTION VALIDATION
====================================================== */

const validateTransaction = (req, res, next) => {
  try {
    const { customer_id, type, amount } = req.body;

    if (
      !validators.isRequired(customer_id) ||
      !validators.isPositiveNumber(customer_id)
    ) {
      throw new AppError("A valid customer ID is required.", 400);
    }

    if (!validators.isRequired(type) || !["credit", "debit"].includes(type)) {
      throw new AppError("Transaction type must be 'credit' or 'debit'.", 400);
    }

    if (!validators.isRequired(amount) || !validators.isValidAmount(amount)) {
      throw new AppError("A valid transaction amount is required.", 400);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   BUDGET VALIDATION
====================================================== */

const validateBudget = (req, res, next) => {
  try {
    const { monthly_limit } = req.body;
    if (
      !validators.isRequired(monthly_limit) ||
      !validators.isPositiveNumber(monthly_limit)
    ) {
      throw new AppError("Monthly budget must be a positive number.", 400);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
  validateRegistration,
  validateLogin,
  validateExpense,
  validateIdParam,
  validateCustomer,
  validateTransaction,
  validateBudget,
};
