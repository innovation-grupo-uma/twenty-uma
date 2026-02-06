/**
 * RLS Rule Types - Shared across backend/frontend
 * Agni CRM Extension
 */

export enum RLSEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

export enum RLSOperation {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export interface RLSCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface RLSRuleExpression {
  and?: RLSRuleExpression[];
  or?: RLSRuleExpression[];
  condition?: RLSCondition;
}

export interface RLSRule {
  id: string;
  workspaceId: string;
  objectMetadataId: string;
  name: string;
  description?: string;
  effect: RLSEffect;
  operations: RLSOperation[];
  expression: RLSRuleExpression;
  priority: number;
  isActive: boolean;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRLSRuleInput {
  workspaceId: string;
  objectMetadataId: string;
  name: string;
  description?: string;
  effect: RLSEffect;
  operations: RLSOperation[];
  expression: RLSRuleExpression;
  priority: number;
  roleIds: string[];
}

export interface UpdateRLSRuleInput {
  name?: string;
  description?: string;
  effect?: RLSEffect;
  operations?: RLSOperation[];
  expression?: RLSRuleExpression;
  priority?: number;
  isActive?: boolean;
  roleIds?: string[];
}
