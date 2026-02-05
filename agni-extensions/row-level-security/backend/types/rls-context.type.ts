/**
 * RLS Evaluation Context
 * Agni CRM Extension - Row-Level Security
 * 
 * Context needed to evaluate RLS rules
 */

export interface RLSContext {
  workspaceId: string;
  workspaceMemberId?: string;
  userWorkspaceId?: string;
  roleIds: string[];
  recordData?: Record<string, any>;
}

export interface RLSEvaluationResult {
  allowed: boolean;
  matchedRules: string[];
  deniedBy?: string;
}
