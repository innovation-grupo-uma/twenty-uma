import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PermissionFlagType } from 'twenty-shared/constants';

import { DependentFieldRuleEntity } from 'packages/twenty-server/src/engine/core-modules/dependent-field/dependent-field-rule.entity';
import { WorkspaceEntity } from 'packages/twenty-server/src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'packages/twenty-server/src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'packages/twenty-server/src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'packages/twenty-server/src/engine/guards/workspace-auth.guard';

import { DependentFieldMetadataService } from './dependent-field-metadata.service';
import { DependentFieldEvaluatorService } from './dependent-field-evaluator.service';
import { CreateDependentFieldRuleInput } from './dtos/create-dependent-field-rule.dto';
import { UpdateDependentFieldRuleInput } from './dtos/update-dependent-field-rule.dto';
import {
  GetDependentFieldRulesInput,
  GetDependentFieldRuleInput,
  DeleteDependentFieldRuleInput,
} from './dtos/get-dependent-field-rules.dto';

/**
 * GraphQL Resolver for Dependent Field Rules
 *
 * Provides mutations and queries for managing dependent field configurations.
 * Only workspace admins can modify rules, but all users can query them.
 */
@Resolver(() => DependentFieldRuleEntity)
export class DependentFieldResolver {
  constructor(
    private readonly metadataService: DependentFieldMetadataService,
    private readonly evaluatorService: DependentFieldEvaluatorService,
  ) {}

  /**
   * Query all dependent field rules for the workspace
   */
  @Query(() => [DependentFieldRuleEntity])
  @UseGuards(WorkspaceAuthGuard)
  async dependentFieldRules(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input', { nullable: true }) input?: GetDependentFieldRulesInput,
  ): Promise<DependentFieldRuleEntity[]> {
    const rules = await this.metadataService.getRules(workspace.id, {
      objectName: input?.objectName,
      controllingField: input?.controllingField,
      dependentField: input?.dependentField,
      type: input?.type,
      includeInactive: input?.includeInactive,
    });

    // Convert to entities for GraphQL
    return rules.map((rule) => this.ruleToEntity(rule));
  }

  /**
   * Query a single dependent field rule by ID
   */
  @Query(() => DependentFieldRuleEntity, { nullable: true })
  @UseGuards(WorkspaceAuthGuard)
  async dependentFieldRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: GetDependentFieldRuleInput,
  ): Promise<DependentFieldRuleEntity | null> {
    const rule = await this.metadataService.getRule(workspace.id, input.id);

    return rule ? this.ruleToEntity(rule) : null;
  }

  /**
   * Create a new dependent field rule (admin only)
   */
  @Mutation(() => DependentFieldRuleEntity)
  @UseGuards(
    WorkspaceAuthGuard,
    SettingsPermissionGuard(PermissionFlagType.DATA_MODEL_SETTINGS),
  )
  async createDependentFieldRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: CreateDependentFieldRuleInput,
  ): Promise<DependentFieldRuleEntity> {
    // Convert array form of controllingValue to single/array as needed
    const normalizedMappings = input.mappings.map((mapping) => ({
      controllingValue:
        mapping.controllingValue.length === 1
          ? mapping.controllingValue[0]
          : mapping.controllingValue,
      dependentValues: mapping.dependentValues,
      visible: mapping.visible,
    }));

    const rule = await this.metadataService.createRule(workspace.id, {
      objectName: input.objectName,
      controllingField: input.controllingField,
      dependentField: input.dependentField,
      type: input.type,
      mappings: normalizedMappings,
      description: input.description,
      isActive: input.isActive,
    });

    // Invalidate cache for this field
    await this.evaluatorService.invalidateCache(
      workspace.id,
      input.objectName,
      input.dependentField,
    );

    return this.ruleToEntity(rule);
  }

  /**
   * Update an existing dependent field rule (admin only)
   */
  @Mutation(() => DependentFieldRuleEntity)
  @UseGuards(
    WorkspaceAuthGuard,
    SettingsPermissionGuard(PermissionFlagType.DATA_MODEL_SETTINGS),
  )
  async updateDependentFieldRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: UpdateDependentFieldRuleInput,
  ): Promise<DependentFieldRuleEntity> {
    // Normalize mappings if provided
    const normalizedMappings = input.mappings?.map((mapping) => ({
      controllingValue:
        mapping.controllingValue.length === 1
          ? mapping.controllingValue[0]
          : mapping.controllingValue,
      dependentValues: mapping.dependentValues,
      visible: mapping.visible,
    }));

    const rule = await this.metadataService.updateRule(
      workspace.id,
      input.id,
      {
        objectName: input.objectName,
        controllingField: input.controllingField,
        dependentField: input.dependentField,
        type: input.type,
        mappings: normalizedMappings,
        description: input.description,
        isActive: input.isActive,
      },
    );

    // Invalidate cache for this field
    if (input.objectName && input.dependentField) {
      await this.evaluatorService.invalidateCache(
        workspace.id,
        input.objectName,
        input.dependentField,
      );
    } else {
      // If object/field changed, invalidate entire workspace cache
      await this.evaluatorService.invalidateWorkspaceCache(workspace.id);
    }

    return this.ruleToEntity(rule);
  }

  /**
   * Delete a dependent field rule (admin only)
   */
  @Mutation(() => Boolean)
  @UseGuards(
    WorkspaceAuthGuard,
    SettingsPermissionGuard(PermissionFlagType.DATA_MODEL_SETTINGS),
  )
  async deleteDependentFieldRule(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('input') input: DeleteDependentFieldRuleInput,
  ): Promise<boolean> {
    // Get rule before deleting to invalidate cache
    const rule = await this.metadataService.getRule(workspace.id, input.id);

    const deleted = await this.metadataService.deleteRule(
      workspace.id,
      input.id,
    );

    if (deleted && rule) {
      // Invalidate cache for this field
      await this.evaluatorService.invalidateCache(
        workspace.id,
        rule.objectName,
        rule.dependentField,
      );
    }

    return deleted;
  }

  /**
   * Helper to convert domain model to GraphQL entity
   */
  private ruleToEntity(rule: any): DependentFieldRuleEntity {
    const entity = new DependentFieldRuleEntity();
    entity.id = rule.id;
    entity.workspaceId = rule.workspaceId;
    entity.objectName = rule.objectName;
    entity.controllingField = rule.controllingField;
    entity.dependentField = rule.dependentField;
    entity.type = rule.type;
    entity.mappings = JSON.stringify(rule.mappings);
    entity.description = rule.description;
    entity.isActive = rule.isActive;
    entity.createdAt = rule.createdAt;
    entity.updatedAt = rule.updatedAt;
    return entity;
  }
}
