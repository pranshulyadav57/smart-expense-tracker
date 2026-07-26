const { standardizeResponse } = require("../utils/responseHandler");
const customerService = require("../services/customerService");
const { validatePagination } = require("../utils/validators");
const { AppError } = require("../middleware/errorMiddleware");
const logger = require("../utils/logger");

// =========================
// ADD CUSTOMER
// =========================
exports.addCustomer = async (req, res, next) => {
  try {
    const newCustomer =
      await customerService.createCustomer(
        req.user.id,
        req.body
      );

    return res.status(201).json(
      standardizeResponse(
        true,
        newCustomer,
        "Customer added successfully"
      )
    );
  } catch (err) {
    logger.error("Add customer failed", {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// GET CUSTOMERS
// =========================
exports.getCustomers = async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortOrder, status } = req.query;

    // Build a sanitized filters object to prevent query corruption.
    const filters = {};
    const potentialFilters = { search, sortBy, sortOrder, status };
    for (const [key, value] of Object.entries(potentialFilters)) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      if (singleValue) {
        filters[key] = singleValue;
      }
    }

    const pagination = validatePagination(page, limit);
    const queryOptions = { ...filters, ...pagination };

    const data =
      await customerService.fetchCustomers(
        req.user.id,
        queryOptions
      );

    return res.json(
      standardizeResponse(
        true,
        data,
        "Customers fetched successfully"
      )
    );
  } catch (err) {
    logger.error("Get customers failed", {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// GET CUSTOMER BY ID
// =========================
exports.getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer =
      await customerService.fetchCustomerById(
        req.user.id,
        id
      );

    if (!customer) {
      return res.status(404).json(
        standardizeResponse(
          false,
          null,
          "Customer not found"
        )
      );
    }

    return res.json(
      standardizeResponse(
        true,
        customer,
        "Customer fetched successfully"
      )
    );
  } catch (err) {
    logger.error("Get customer by ID failed", {
      userId: req.user?.id,
      customerId: req.params.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// UPDATE CUSTOMER
// =========================
exports.updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success =
      await customerService.updateCustomerDetails(
        req.user.id,
        id,
        req.body
      );

    if (!success) {
      return res.status(404).json(
        standardizeResponse(
          false,
          null,
          "Customer not found"
        )
      );
    }

    return res.json(
      standardizeResponse(
        true,
        null,
        "Customer updated successfully"
      )
    );
  } catch (err) {
    logger.error("Update customer failed", {
      userId: req.user?.id,
      customerId: req.params.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// DELETE CUSTOMER
// =========================
exports.deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success =
      await customerService.softDeleteCustomer(
        req.user.id,
        id
      );

    if (!success) {
      return res.status(404).json(
        standardizeResponse(
          false,
          null,
          "Customer not found"
        )
      );
    }

    return res.json(
      standardizeResponse(
        true,
        null,
        "Customer deleted successfully"
      )
    );
  } catch (err) {
    logger.error("Delete customer failed", {
      userId: req.user?.id,
      customerId: req.params.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// GET CUSTOMER STATS
// =========================
exports.getCustomerStats = async (req, res, next) => {
  try {
    const stats =
      await customerService.fetchCustomerStats(
        req.user.id
      );

    return res.json(
      standardizeResponse(
        true,
        stats,
        "Customer stats fetched successfully"
      )
    );
  } catch (err) {
    logger.error("Get customer stats failed", {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// UPLOAD AVATAR
// =========================
exports.uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;

    if (!req.file) {
      return res.status(400).json(standardizeResponse(false, null, "No file uploaded"));
    }

    const avatarUrl = `/public/uploads/avatars/${req.file.filename}`;

    await customerService.updateCustomerAvatar(userId, customerId, avatarUrl);

    return res.json(standardizeResponse(true, { avatar: avatarUrl }, "Customer avatar uploaded successfully"));
  } catch (err) {
    // If multer saved a file but service failed (e.g., DB error), remove the uploaded file to avoid orphaned files
    try {
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        const uploadedPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars', req.file.filename);
        if (fs.existsSync(uploadedPath)) {
          fs.unlinkSync(uploadedPath);
        }
      }
    } catch (cleanupErr) {
      logger.warn('Failed to cleanup uploaded avatar after error', { err: cleanupErr.message });
    }

    logger.error("Upload customer avatar failed", {
      userId: req.user?.id,
      customerId: req.params.id,
      error: err.message,
      stack: err.stack,
    });

    next(err);
  }
};

// =========================
// DELETE AVATAR
// =========================
exports.deleteAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;

    const result = await customerService.deleteCustomerAvatar(userId, customerId);

    if (!result) {
      return res.status(404).json(standardizeResponse(false, null, 'Customer not found'));
    }

    return res.json(standardizeResponse(true, null, 'Customer avatar deleted successfully'));
  } catch (err) {
    logger.error('Delete customer avatar failed', {
      userId: req.user?.id,
      customerId: req.params.id,
      error: err.message,
      stack: err.stack
    });

    next(err);
  }
};