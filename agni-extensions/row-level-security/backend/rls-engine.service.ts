import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RLSRuleEntity } from '../../../packages/twenty-server/src/engine/metadata-modules/row-level-security/rls-rule.entity';
import { RLSEffect, RLSOperation } from '../shared/types';
import { RLSContext, RLSEvaluationResult } from './types/rls-context.type';
import { evaluateExpression } from './utils/expression-evaluator.util';

/**
 * RLS Evaluation Engine Service
 * Agni CRM Extension - Row-Level Security
 * 
 * Core service that evaluates RLS rules to determine access
 */
@Injectable()
export class RLSEngineService {
  private readonly logger = new Logger(RLSEngineService.name);

  constructor(
    @InjectRepository(RLSRuleEntity)
    private readonly rlsRuleRepository: Repository<RLSRuleEntity>,
  ) {}

  /**
   * Evaluate access for a given context and operation
   * 
   * @param context - RLS context with user and workspace info
   * @param objectMetadataId - Object being accessed
   * @param operation - Operation being performed
   * @param recordData - Optional record data for row-level checks
   * @returns Evaluation result with allowed/denied status
   */
  async evaluateAccess(
    context: RLSContext,
    objectMetadataId: string,
    operation: RLSOperation,
    recordData?: Record<string, any>,
  ): Promise<RLSEvaluationResult> {
    // Get applicable rules for this object and user roles
    const rules = await this.getApplicableRules(
      context.workspaceId,
      objectMetadataId,
      context.roleIds,
      operation,
    );

    if (rules.length === 0) {
      // No rules = default allow (Twenty's existing permission system handles base permissions)
      return {
        allowed: true,
        matchedRules: [],
      };
    }

    // Sort rules by priority (highest first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    // Track matched rules
    const matchedRules: string[] = [];
    let finalEffect: RLSEffect | null = null;
    let deniedBy: string | undefined;

    // Evaluate rules in priority order
    for (const rule of sortedRules) {
      const matches = this.evaluateRule(rule, recordData || {}, context);

      if (matches) {
        matchedRules.push(rule.id);

        // DENY always wins
        if (rule.effect === RLSEffect.DENY) {
          finalEffect = RLSEffect.DENY;
          deniedBy = rule.id;
          break; // No need to check further rules
        }

        // Track first ALLOW if no DENY found yet
        if (finalEffect === null && rule.effect === RLSEffect.ALLOW) {
          finalEffect = RLSEffect.ALLOW;
        }
      }
    }

    // If no rules matched, default to deny (secure by default)
    const allowed = finalEffect === RLSEffect.ALLOW;

    this.logger.debug(
      `RLS Evaluation: ${allowed ? 'ALLOWED' : 'DENIED'} for object ${objectMetadataId}, operation ${operation}. Matched ${matchedRules.length} rules.`,
    );

    return {
      allowed,
      matchedRules,
      deniedBy,
    };
  }

  /**
   * Evaluate a single rule against record data
   */
  private evaluateRule(
    rule: RLSRuleEntity,
    recordData: Record<string, any>,
    context: RLSContext,
  ): boolean {
    try {
      return evaluateExpression(rule.expression, recordData, context);
    } catch (error) {
      this.logger.error(
        `Error evaluating rule ${rule.id}: ${error.message}`,
        error.stack,
      );
      // Fail-safe: if rule evaluation fails, treat as not matching
      return false;
    }
  }

  /**
   * Get all applicable rules for the given parameters
   */
  private async getApplicableRules(
    workspaceId: string,
    objectMetadataId: string,
    roleIds: string[],
    operation: RLSOperation,
  ): Promise<RLSRuleEntity[]> {
    return await this.rlsRuleRepository
      .createQueryBuilder('rule')
      .where('rule.workspaceId = :workspaceId', { workspaceId })
      .andWhere('rule.objectMetadataId = :objectMetadataId', {
        objectMetadataId,
      })
      .andWhere('rule.isActive = :isActive', { isActive: true })
      .andWhere('rule.roleIds && :roleIds', { roleIds })
      .andWhere(':operation = ANY(rule.operations)', { operation })
      .orderBy('rule.priority', 'DESC')
      .getMany();
  }

  /**
   * Batch evaluate access for multiple records
   * Useful for query filtering
   */
  async evaluateBatch(
    context: RLSContext,
    objectMetadataId: string,
    operation: RLSOperation,
    records: Record<string, any>[],
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Get rules once for all records
    const rules = await this.getApplicableRules(
      context.workspaceId,
      objectMetadataId,
      context.roleIds,
      operation,
    );

    if (rules.length === 0) {
      // No rules = all allowed
      for (const record of records) {
        results[record.id] = true;
      }
      return results;
    }

    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    // Evaluate each record
    for (const record of records) {
      let allowed = false;

      for (const rule of sortedRules) {
        const matches = this.evaluateRule(rule, record, context);

        if (matches) {
          if (rule.effect === RLSEffect.DENY) {
            allowed = false;
            break; // DENY wins
          }
          if (rule.effect === RLSEffect.ALLOW) {
            allowed = true;
          }
        }
      }

      results[record.id] = allowed;
    }

    return results;
  }
}
