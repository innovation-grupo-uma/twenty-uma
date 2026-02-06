import { UseGuards, Logger } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RLSRuleEntity } from '../../../packages/twenty-server/src/engine/metadata-modules/row-level-security/rls-rule.entity';
import { RLSRuleService } from './rls-rule.service';
import { RLSEngineService } from './rls-engine.service';
import { WorkspaceEntity } from '../../../packages/twenty-server/src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from '../../../packages/twenty-server/src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from '../../../packages/twenty-server/src/engine/guards/workspace-auth.guard';
import {
  CreateRLSRuleInput,
  UpdateRLSRuleInput,
  GetRLSRuleInput,
  GetRLSRulesByObjectInput,
  DeleteRLSRuleInput,
  TestRLSRuleInput,
  RLSTestResult,
} from './dtos';

/**
 * RLS Rule Resolver
 * Agni CRM Extension - Row-Level Security
 * 
 * GraphQL API for managing RLS rules
 * Only workspace owners can configure RLS
 */
@Resolver(() => RLSRuleEntity)
@UseGuards(WorkspaceAuthGuard)
export class RLSRuleResolver {
  private readonly logger = new Logger(RLSRuleResolver.name);

  constructor(
    private readonly rlsRuleService: RLSRuleService,
    private readonly rlsEngineService: RLSEngineService,
  ) {}

  /**
   * Create a new RLS rule
   */
  @Mutation(() => RLSRuleEntity)
  async createRLSRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: CreateRLSRuleInput,
  ): Promise<RLSRuleEntity> {
    this.logger.log(`Creating RLS rule for workspace ${workspace.id}`);

    // Ensure the rule is created for the current workspace
    const ruleInput = {
      ...input,
      workspaceId: workspace.id,
    };

    return this.rlsRuleService.createRule(ruleInput);
  }

  /**
   * Update an existing RLS rule
   */
  @Mutation(() => RLSRuleEntity, { nullable: true })
  async updateRLSRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: UpdateRLSRuleInput,
  ): Promise<RLSRuleEntity | null> {
    this.logger.log(`Updating RLS rule ${input.id} for workspace ${workspace.id}`);

    // Verify the rule belongs to this workspace
    const existingRule = await this.rlsRuleService.getRule(input.id);
    if (!existingRule || existingRule.workspaceId !== workspace.id) {
      this.logger.warn(`Rule ${input.id} not found or doesn't belong to workspace ${workspace.id}`);
      return null;
    }

    return this.rlsRuleService.updateRule(input.id, input);
  }

  /**
   * Delete (soft delete) an RLS rule
   */
  @Mutation(() => Boolean)
  async deleteRLSRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: DeleteRLSRuleInput,
  ): Promise<boolean> {
    this.logger.log(`Deleting RLS rule ${input.id} for workspace ${workspace.id}`);

    // Verify the rule belongs to this workspace
    const existingRule = await this.rlsRuleService.getRule(input.id);
    if (!existingRule || existingRule.workspaceId !== workspace.id) {
      this.logger.warn(`Rule ${input.id} not found or doesn't belong to workspace ${workspace.id}`);
      return false;
    }

    return this.rlsRuleService.deleteRule(input.id);
  }

  /**
   * Get a single RLS rule by ID
   */
  @Query(() => RLSRuleEntity, { nullable: true })
  async getRLSRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: GetRLSRuleInput,
  ): Promise<RLSRuleEntity | null> {
    const rule = await this.rlsRuleService.getRule(input.id);

    // Only return if it belongs to this workspace
    if (!rule || rule.workspaceId !== workspace.id) {
      return null;
    }

    return rule;
  }

  /**
   * Get all RLS rules for an object
   */
  @Query(() => [RLSRuleEntity])
  async getRLSRules(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: GetRLSRulesByObjectInput,
  ): Promise<RLSRuleEntity[]> {
    const rules = await this.rlsRuleService.getRulesByObject(
      input.objectMetadataId,
    );

    // Filter to only rules from this workspace
    return rules.filter((rule) => rule.workspaceId === workspace.id);
  }

  /**
   * Get all RLS rules for the current workspace
   */
  @Query(() => [RLSRuleEntity])
  async getRLSRulesByWorkspace(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<RLSRuleEntity[]> {
    return this.rlsRuleService.getRulesByWorkspace(workspace.id);
  }

  /**
   * Test an RLS rule with a given context
   * Crucial for testing rules before activating them
   */
  @Query(() => RLSTestResult)
  async testRLSRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: TestRLSRuleInput,
  ): Promise<RLSTestResult> {
    this.logger.log(`Testing RLS rule ${input.ruleId} for workspace ${workspace.id}`);

    // Verify the rule belongs to this workspace
    const rule = await this.rlsRuleService.getRule(input.ruleId);
    if (!rule || rule.workspaceId !== workspace.id) {
      return {
        ruleId: input.ruleId,
        passed: false,
        reason: 'Rule not found or does not belong to this workspace',
        evaluationDetails: {},
      };
    }

    try {
      // Evaluate the rule with the test context
      const passed = this.rlsEngineService.evaluateExpression(
        rule.expression,
        input.testContext,
      );

      return {
        ruleId: input.ruleId,
        passed,
        reason: passed
          ? 'Rule expression evaluated to true'
          : 'Rule expression evaluated to false',
        evaluationDetails: {
          expression: rule.expression,
          context: input.testContext,
          effect: rule.effect,
          operations: rule.operations,
        },
      };
    } catch (error) {
      this.logger.error(`Error testing RLS rule ${input.ruleId}:`, error);
      return {
        ruleId: input.ruleId,
        passed: false,
        reason: `Error evaluating rule: ${error.message}`,
        evaluationDetails: {
          error: error.message,
        },
      };
    }
  }
}
