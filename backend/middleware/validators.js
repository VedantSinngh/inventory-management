import { body } from 'express-validator';

/**
 * Product Validation Schemas
 */
export const validateProductCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name must be between 1 and 255 characters'),
  body('sku')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
  body('category')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
  body('supplier')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID')
];

export const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name must be between 1 and 255 characters'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
  body('supplier')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Supplier name must not exceed 255 characters'),
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID')
];
