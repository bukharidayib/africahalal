import { z } from 'zod';

export const organizationSchema = z.object({
  entity_name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(200, 'Business name must be less than 200 characters'),
  registration_number: z.string().trim().min(3, 'Registration number must be at least 3 characters').max(50, 'Registration number must be less than 50 characters'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(500, 'Address must be less than 500 characters'),
  country: z.string().trim().min(2, 'Country is required').max(100, 'Country must be less than 100 characters'),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200, 'Product name must be less than 200 characters'),
  brand: z.string().trim().min(1, 'Brand is required').max(200, 'Brand must be less than 200 characters'),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
});

export const ingredientSchema = z.object({
  ingredient_name: z.string().trim().min(1, 'Ingredient name is required').max(200, 'Ingredient name must be less than 200 characters'),
  percentage: z.number().min(0, 'Percentage must be 0 or greater').max(100, 'Percentage cannot exceed 100').nullable().optional(),
  source: z.string().max(200, 'Source must be less than 200 characters').nullable().optional(),
  supplier_name: z.string().max(200, 'Supplier name must be less than 200 characters').nullable().optional(),
  is_halal_certified: z.boolean().optional(),
});

export const declarationSchema = z.object({
  declaration_confirmed: z.literal(true, { errorMap: () => ({ message: 'You must confirm the declaration' }) }),
  declaration_compliance: z.literal(true, { errorMap: () => ({ message: 'You must agree to compliance requirements' }) }),
  signature: z.string().trim().min(2, 'Signature is required (minimum 2 characters)').max(200, 'Signature must be less than 200 characters'),
});

export const paymentPhoneSchema = z.string()
  .trim()
  .regex(/^(09|07)\d{8}$/, 'Enter a valid Zambian phone number (e.g., 097XXXXXXX)');

export const cardPaymentSchema = z.object({
  cardNumber: z.string().trim().regex(/^\d{13,19}$/, 'Enter a valid card number (13-19 digits)'),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Enter a valid month (01-12)'),
  expiryYear: z.string().regex(/^\d{4}$/, 'Enter a valid 4-digit year'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Enter a valid CVV (3-4 digits)'),
});
