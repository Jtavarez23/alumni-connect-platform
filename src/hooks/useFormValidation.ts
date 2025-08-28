import { useState, useEffect } from 'react';
import { z } from 'zod';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FormField {
  value: any;
  error: string | null;
  touched: boolean;
  rules?: ValidationRule;
}

export interface UseFormValidationProps {
  initialValues: Record<string, any>;
  validationRules?: Record<string, ValidationRule>;
  zodSchema?: z.ZodSchema;
}

export function useFormValidation({
  initialValues,
  validationRules = {},
  zodSchema
}: UseFormValidationProps) {
  const [fields, setFields] = useState<Record<string, FormField>>(() => {
    const initialFields: Record<string, FormField> = {};
    Object.keys(initialValues).forEach(key => {
      initialFields[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
        rules: validationRules[key]
      };
    });
    return initialFields;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: string, value: any): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      return `${name} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || value.toString().trim() === '') {
      return null;
    }

    // Min length validation
    if (rules.minLength && value.toString().length < rules.minLength) {
      return `${name} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && value.toString().length > rules.maxLength) {
      return `${name} must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value.toString())) {
      return `${name} format is invalid`;
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  };

  const validateWithZod = (): Record<string, string> => {
    if (!zodSchema) return {};

    const values = Object.keys(fields).reduce((acc, key) => {
      acc[key] = fields[key].value;
      return acc;
    }, {} as Record<string, any>);

    try {
      zodSchema.parse(values);
      return {};
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        return errors;
      }
      return {};
    }
  };

  const updateField = (name: string, value: any, shouldValidate = true) => {
    setFields(prev => {
      const newFields = { ...prev };
      newFields[name] = {
        ...newFields[name],
        value,
        touched: true,
        error: shouldValidate ? validateField(name, value) : null
      };
      return newFields;
    });
  };

  const validateAll = (): boolean => {
    let hasErrors = false;
    const newFields = { ...fields };

    // Validate with rules first
    Object.keys(newFields).forEach(name => {
      const error = validateField(name, newFields[name].value);
      newFields[name] = {
        ...newFields[name],
        error,
        touched: true
      };
      if (error) hasErrors = true;
    });

    // Validate with Zod schema if provided
    if (zodSchema) {
      const zodErrors = validateWithZod();
      Object.keys(zodErrors).forEach(name => {
        if (newFields[name]) {
          newFields[name] = {
            ...newFields[name],
            error: zodErrors[name],
            touched: true
          };
          hasErrors = true;
        }
      });
    }

    setFields(newFields);
    return !hasErrors;
  };

  const reset = () => {
    const resetFields: Record<string, FormField> = {};
    Object.keys(initialValues).forEach(key => {
      resetFields[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
        rules: validationRules[key]
      };
    });
    setFields(resetFields);
    setIsSubmitting(false);
  };

  const getFieldError = (name: string): string | null => {
    return fields[name]?.error || null;
  };

  const getFieldValue = (name: string): any => {
    return fields[name]?.value;
  };

  const isFieldTouched = (name: string): boolean => {
    return fields[name]?.touched || false;
  };

  const hasErrors = (): boolean => {
    return Object.values(fields).some(field => field.error !== null);
  };

  const getValues = (): Record<string, any> => {
    const values: Record<string, any> = {};
    Object.keys(fields).forEach(key => {
      values[key] = fields[key].value;
    });
    return values;
  };

  return {
    fields,
    updateField,
    validateAll,
    reset,
    getFieldError,
    getFieldValue,
    isFieldTouched,
    hasErrors,
    getValues,
    isSubmitting,
    setIsSubmitting
  };
}