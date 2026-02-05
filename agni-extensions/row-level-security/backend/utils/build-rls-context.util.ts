/**
 * Build RLS Context Utility
 * Agni CRM Extension - Row-Level Security
 * 
 * Converts Twenty's AuthContext to RLS evaluation context
 */

import { AuthContext } from '../../../../packages/twenty-server/src/engine/core-modules/auth/types/auth-context.type';
import { RLSContext } from '../types/rls-context.type';

/**
 * Extract role IDs from AuthContext
 * 
 * Note: Twenty's role system uses RoleTarget to assign roles to users.
 * This helper extracts roleIds from the workspaceMember if available.
 */
async function getRoleIdsFromContext(
  authContext: AuthContext,
): Promise<string[]> {
  // TODO: Implement actual role fetching from RoleTarget
  // For now, return empty array (will be implemented in integration phase)
  
  // Example implementation:
  // const roleTargets = await roleTargetRepository.find({
  //   where: { userWorkspaceId: authContext.userWorkspaceId }
  // });
  // return roleTargets.map(rt => rt.roleId);

  return [];
}

/**
 * Build RLS context from Twenty's AuthContext
 */
export async function buildRLSContext(
  authContext: AuthContext,
): Promise<RLSContext> {
  if (!authContext.workspace?.id) {
    throw new Error('Workspace context required for RLS evaluation');
  }

  const roleIds = await getRoleIdsFromContext(authContext);

  return {
    workspaceId: authContext.workspace.id,
    workspaceMemberId: authContext.workspaceMemberId,
    userWorkspaceId: authContext.userWorkspaceId,
    roleIds,
  };
}

/**
 * Build RLS context with record data
 */
export async function buildRLSContextWithRecord(
  authContext: AuthContext,
  recordData: Record<string, any>,
): Promise<RLSContext> {
  const baseContext = await buildRLSContext(authContext);

  return {
    ...baseContext,
    recordData,
  };
}
