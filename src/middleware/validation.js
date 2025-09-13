const { body, param, query, validationResult } = require("express-validator")

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    })
  }
  next()
}

// Common validation rules
const validateTenant = [
  body("name").notEmpty().withMessage("Tenant name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("shopDomain")
    .matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
    .withMessage("Valid Shopify domain required"),
  body("accessToken").notEmpty().withMessage("Access token is required"),
  handleValidationErrors,
]

const validateShopifyId = [
  param("shopifyId").isNumeric().withMessage("Valid Shopify ID required"),
  handleValidationErrors,
]

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
]

module.exports = {
  handleValidationErrors,
  validateTenant,
  validateShopifyId,
  validatePagination,
}
