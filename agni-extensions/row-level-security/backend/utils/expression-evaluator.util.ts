/**
 * RLS Expression Evaluator
 * Agni CRM Extension - Row-Level Security
 * 
 * Evaluates RLS rule expressions against record data and context
 */

import { RLSRuleExpression, RLSCondition } from '../../shared/types';
import { RLSContext } from '../types/rls-context.type';

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: RLSCondition,
  recordData: Record<string, any>,
  context: RLSContext,
): boolean {
  const { field, operator, value } = condition;

  // Special handling for context variables
  let fieldValue = recordData[field];
  let compareValue = value;

  // Replace context placeholders
  if (typeof value === 'string') {
    if (value === '{{currentUser.id}}') {
      compareValue = context.workspaceMemberId;
    } else if (value === '{{currentUser.workspaceId}}') {
      compareValue = context.userWorkspaceId;
    }
  }

  // Evaluate based on operator
  switch (operator) {
    case 'eq':
      return fieldValue === compareValue;

    case 'ne':
      return fieldValue !== compareValue;

    case 'in':
      if (!Array.isArray(compareValue)) {
        return false;
      }
      return compareValue.includes(fieldValue);

    case 'contains':
      if (typeof fieldValue !== 'string') {
        return false;
      }
      return fieldValue.includes(String(compareValue));

    case 'startsWith':
      if (typeof fieldValue !== 'string') {
        return false;
      }
      return fieldValue.startsWith(String(compareValue));

    case 'endsWith':
      if (typeof fieldValue !== 'string') {
        return false;
      }
      return fieldValue.endsWith(String(compareValue));

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Recursively evaluate an RLS expression
 */
export function evaluateExpression(
  expression: RLSRuleExpression,
  recordData: Record<string, any>,
  context: RLSContext,
): boolean {
  // AND logic
  if (expression.and && expression.and.length > 0) {
    return expression.and.every((subExpr) =>
      evaluateExpression(subExpr, recordData, context),
    );
  }

  // OR logic
  if (expression.or && expression.or.length > 0) {
    return expression.or.some((subExpr) =>
      evaluateExpression(subExpr, recordData, context),
    );
  }

  // Single condition
  if (expression.condition) {
    return evaluateCondition(expression.condition, recordData, context);
  }

  // Empty expression defaults to false
  return false;
}
