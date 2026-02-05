/**
 * Expression Evaluator Tests
 * Agni CRM Extension - Row-Level Security
 */

import { evaluateExpression } from '../backend/utils/expression-evaluator.util';
import { RLSRuleExpression } from '../shared/types';
import { RLSContext } from '../backend/types/rls-context.type';

describe('RLS Expression Evaluator', () => {
  const mockContext: RLSContext = {
    workspaceId: 'workspace-123',
    workspaceMemberId: 'member-456',
    userWorkspaceId: 'user-ws-789',
    roleIds: ['role-1'],
  };

  describe('Simple conditions', () => {
    it('should evaluate eq operator correctly', () => {
      const expression: RLSRuleExpression = {
        condition: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
      };

      const recordData = { status: 'active' };
      expect(evaluateExpression(expression, recordData, mockContext)).toBe(
        true,
      );

      const recordData2 = { status: 'inactive' };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        false,
      );
    });

    it('should evaluate ne operator correctly', () => {
      const expression: RLSRuleExpression = {
        condition: {
          field: 'status',
          operator: 'ne',
          value: 'deleted',
        },
      };

      const recordData = { status: 'active' };
      expect(evaluateExpression(expression, recordData, mockContext)).toBe(
        true,
      );
    });

    it('should evaluate in operator correctly', () => {
      const expression: RLSRuleExpression = {
        condition: {
          field: 'status',
          operator: 'in',
          value: ['active', 'pending', 'review'],
        },
      };

      const recordData1 = { status: 'active' };
      expect(evaluateExpression(expression, recordData1, mockContext)).toBe(
        true,
      );

      const recordData2 = { status: 'deleted' };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        false,
      );
    });

    it('should evaluate contains operator correctly', () => {
      const expression: RLSRuleExpression = {
        condition: {
          field: 'email',
          operator: 'contains',
          value: '@example.com',
        },
      };

      const recordData1 = { email: 'user@example.com' };
      expect(evaluateExpression(expression, recordData1, mockContext)).toBe(
        true,
      );

      const recordData2 = { email: 'user@other.com' };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        false,
      );
    });
  });

  describe('Context variable substitution', () => {
    it('should replace {{currentUser.id}} with workspaceMemberId', () => {
      const expression: RLSRuleExpression = {
        condition: {
          field: 'ownerId',
          operator: 'eq',
          value: '{{currentUser.id}}',
        },
      };

      const recordData = { ownerId: 'member-456' };
      expect(evaluateExpression(expression, recordData, mockContext)).toBe(
        true,
      );

      const recordData2 = { ownerId: 'other-member' };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        false,
      );
    });
  });

  describe('Logical operators', () => {
    it('should evaluate AND expression correctly', () => {
      const expression: RLSRuleExpression = {
        and: [
          {
            condition: {
              field: 'status',
              operator: 'eq',
              value: 'active',
            },
          },
          {
            condition: {
              field: 'visibility',
              operator: 'eq',
              value: 'public',
            },
          },
        ],
      };

      const recordData1 = { status: 'active', visibility: 'public' };
      expect(evaluateExpression(expression, recordData1, mockContext)).toBe(
        true,
      );

      const recordData2 = { status: 'active', visibility: 'private' };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        false,
      );
    });

    it('should evaluate OR expression correctly', () => {
      const expression: RLSRuleExpression = {
        or: [
          {
            condition: {
              field: 'status',
              operator: 'eq',
              value: 'draft',
            },
          },
          {
            condition: {
              field: 'status',
              operator: 'eq',
              value: 'review',
            },
          },
        ],
      };

      const recordData1 = { status: 'draft' };
      expect(evaluateExpression(expression, recordData1, mockContext)).toBe(
        true,
      );

      const recordData2 = { status: 'review' };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        true,
      );

      const recordData3 = { status: 'published' };
      expect(evaluateExpression(expression, recordData3, mockContext)).toBe(
        false,
      );
    });

    it('should evaluate nested AND/OR expressions', () => {
      const expression: RLSRuleExpression = {
        and: [
          {
            condition: {
              field: 'type',
              operator: 'eq',
              value: 'deal',
            },
          },
          {
            or: [
              {
                condition: {
                  field: 'ownerId',
                  operator: 'eq',
                  value: '{{currentUser.id}}',
                },
              },
              {
                condition: {
                  field: 'visibility',
                  operator: 'eq',
                  value: 'shared',
                },
              },
            ],
          },
        ],
      };

      // Type=deal AND (owner=current OR visibility=shared)
      const recordData1 = {
        type: 'deal',
        ownerId: 'member-456',
        visibility: 'private',
      };
      expect(evaluateExpression(expression, recordData1, mockContext)).toBe(
        true,
      );

      const recordData2 = {
        type: 'deal',
        ownerId: 'other',
        visibility: 'shared',
      };
      expect(evaluateExpression(expression, recordData2, mockContext)).toBe(
        true,
      );

      const recordData3 = {
        type: 'deal',
        ownerId: 'other',
        visibility: 'private',
      };
      expect(evaluateExpression(expression, recordData3, mockContext)).toBe(
        false,
      );
    });
  });
});
