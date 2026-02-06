import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RLSRuleEntity } from '../../../packages/twenty-server/src/engine/metadata-modules/row-level-security/rls-rule.entity';
import { WorkspaceCache } from '../../../packages/twenty-server/src/engine/workspace-cache/decorators/workspace-cache.decorator';
import { WorkspaceCacheProvider } from '../../../packages/twenty-server/src/engine/workspace-cache/interfaces/workspace-cache-provider.service';
import { WorkspaceCacheService } from '../../../packages/twenty-server/src/engine/workspace-cache/services/workspace-cache.service';

/**
 * RLS Rules Cache Maps Type
 */
export interface RLSRulesCacheMaps {
  byId: Record<string, RLSRuleEntity>;
  byObjectMetadataId: Record<string, string[]>; // objectId -> ruleIds[]
  byRoleId: Record<string, string[]>; // roleId -> ruleIds[]
}

/**
 * RLS Rules Cache Service
 * Agni CRM Extension - Row-Level Security
 * 
 * Caches RLS rules per workspace for fast evaluation
 */
@Injectable()
@WorkspaceCache('rlsRulesMaps')
export class RLSRulesCacheService extends WorkspaceCacheProvider<RLSRulesCacheMaps> {
  constructor(
    @InjectRepository(RLSRuleEntity)
    private readonly rlsRuleRepository: Repository<RLSRuleEntity>,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {
    super();
  }

  /**
   * Compute cache for a workspace
   */
  async computeForCache(workspaceId: string): Promise<RLSRulesCacheMaps> {
    const rules = await this.rlsRuleRepository.find({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    const cacheMaps: RLSRulesCacheMaps = {
      byId: {},
      byObjectMetadataId: {},
      byRoleId: {},
    };

    for (const rule of rules) {
      // Index by ID
      cacheMaps.byId[rule.id] = rule;

      // Index by object metadata ID
      if (!cacheMaps.byObjectMetadataId[rule.objectMetadataId]) {
        cacheMaps.byObjectMetadataId[rule.objectMetadataId] = [];
      }
      cacheMaps.byObjectMetadataId[rule.objectMetadataId].push(rule.id);

      // Index by role IDs
      for (const roleId of rule.roleIds) {
        if (!cacheMaps.byRoleId[roleId]) {
          cacheMaps.byRoleId[roleId] = [];
        }
        cacheMaps.byRoleId[roleId].push(rule.id);
      }
    }

    return cacheMaps;
  }

  /**
   * Get rules for an object and roles (from cache)
   */
  async getRulesForObjectAndRoles(
    workspaceId: string,
    objectMetadataId: string,
    roleIds: string[],
  ): Promise<RLSRuleEntity[]> {
    const { rlsRulesMaps } = await this.workspaceCacheService.getOrRecompute(
      workspaceId,
      ['rlsRulesMaps'],
    );

    if (!rlsRulesMaps) {
      return [];
    }

    const objectRuleIds = rlsRulesMaps.byObjectMetadataId[objectMetadataId] || [];
    const relevantRules: RLSRuleEntity[] = [];

    for (const ruleId of objectRuleIds) {
      const rule = rlsRulesMaps.byId[ruleId];

      if (rule && rule.roleIds.some((roleId) => roleIds.includes(roleId))) {
        relevantRules.push(rule);
      }
    }

    return relevantRules;
  }

  /**
   * Invalidate cache for a workspace (call when rules change)
   */
  async invalidateCache(workspaceId: string): Promise<void> {
    await this.workspaceCacheService.invalidateAndRecompute(workspaceId, [
      'rlsRulesMaps',
    ]);
  }
}
