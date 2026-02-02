import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DependentFieldRuleEntity } from 'packages/twenty-server/src/engine/core-modules/dependent-field/dependent-field-rule.entity';
import {
  DependentFieldRule,
  DependentFieldRuleInput,
  DependentFieldRuleUpdateInput,
  DependentFieldRuleQuery,
  DependentFieldMapping,
  DependentFieldStats,
} from '../shared/types';

/**
 * Service for managing dependent field rule metadata
 *
 * Handles CRUD operations for dependent field rules with multi-tenant workspace isolation.
 * All operations are scoped to a specific workspace ID.
 */
@Injectable()
export class DependentFieldMetadataService {
  private readonly logger = new Logger(DependentFieldMetadataService.name);

  constructor(
    @InjectRepository(DependentFieldRuleEntity, 'core')
    private readonly dependentFieldRuleRepository: Repository<DependentFieldRuleEntity>,
  ) {}

  /**
   * Create a new dependent field rule
   */
  async createRule(
    workspaceId: string,
    input: DependentFieldRuleInput,
  ): Promise<DependentFieldRule> {
    this.logger.log(
      `Creating dependent field rule for workspace ${workspaceId}: ${input.objectName}.${input.dependentField}`,
    );

    // Validate mappings
    this.validateMappings(input.mappings, input.type);

    const entity = this.dependentFieldRuleRepository.create({
      workspaceId,
      objectName: input.objectName,
      controllingField: input.controllingField,
      dependentField: input.dependentField,
      type: input.type,
      mappings: JSON.stringify(input.mappings),
      description: input.description,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    const savedEntity = await this.dependentFieldRuleRepository.save(entity);

    return this.entityToRule(savedEntity);
  }

  /**
   * Update an existing dependent field rule
   */
  async updateRule(
    workspaceId: string,
    ruleId: string,
    input: DependentFieldRuleUpdateInput,
  ): Promise<DependentFieldRule> {
    this.logger.log(
      `Updating dependent field rule ${ruleId} for workspace ${workspaceId}`,
    );

    const entity = await this.dependentFieldRuleRepository.findOne({
      where: { id: ruleId, workspaceId },
    });

    if (!entity) {
      throw new NotFoundException(
        `Dependent field rule with ID ${ruleId} not found in workspace ${workspaceId}`,
      );
    }

    // Validate mappings if provided
    if (input.mappings) {
      const type = input.type || entity.type;
      this.validateMappings(input.mappings, type);
    }

    // Update fields
    if (input.objectName !== undefined) entity.objectName = input.objectName;
    if (input.controllingField !== undefined)
      entity.controllingField = input.controllingField;
    if (input.dependentField !== undefined)
      entity.dependentField = input.dependentField;
    if (input.type !== undefined) entity.type = input.type;
    if (input.mappings !== undefined)
      entity.mappings = JSON.stringify(input.mappings);
    if (input.description !== undefined) entity.description = input.description;
    if (input.isActive !== undefined) entity.isActive = input.isActive;

    const savedEntity = await this.dependentFieldRuleRepository.save(entity);

    return this.entityToRule(savedEntity);
  }

  /**
   * Delete a dependent field rule
   */
  async deleteRule(workspaceId: string, ruleId: string): Promise<boolean> {
    this.logger.log(
      `Deleting dependent field rule ${ruleId} for workspace ${workspaceId}`,
    );

    const result = await this.dependentFieldRuleRepository.delete({
      id: ruleId,
      workspaceId,
    });

    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Get a single dependent field rule by ID
   */
  async getRule(
    workspaceId: string,
    ruleId: string,
  ): Promise<DependentFieldRule | null> {
    const entity = await this.dependentFieldRuleRepository.findOne({
      where: { id: ruleId, workspaceId },
    });

    return entity ? this.entityToRule(entity) : null;
  }

  /**
   * Get all rules matching the query parameters
   */
  async getRules(
    workspaceId: string,
    query?: DependentFieldRuleQuery,
  ): Promise<DependentFieldRule[]> {
    const queryBuilder = this.dependentFieldRuleRepository
      .createQueryBuilder('rule')
      .where('rule.workspaceId = :workspaceId', { workspaceId });

    // Apply filters
    if (query?.objectName) {
      queryBuilder.andWhere('rule.objectName = :objectName', {
        objectName: query.objectName,
      });
    }

    if (query?.controllingField) {
      queryBuilder.andWhere('rule.controllingField = :controllingField', {
        controllingField: query.controllingField,
      });
    }

    if (query?.dependentField) {
      queryBuilder.andWhere('rule.dependentField = :dependentField', {
        dependentField: query.dependentField,
      });
    }

    if (query?.type) {
      queryBuilder.andWhere('rule.type = :type', { type: query.type });
    }

    if (!query?.includeInactive) {
      queryBuilder.andWhere('rule.isActive = :isActive', { isActive: true });
    }

    const entities = await queryBuilder.getMany();

    return entities.map((entity) => this.entityToRule(entity));
  }

  /**
   * Get rules by object name (most common query pattern)
   */
  async getRulesByObject(
    workspaceId: string,
    objectName: string,
    includeInactive = false,
  ): Promise<DependentFieldRule[]> {
    return this.getRules(workspaceId, { objectName, includeInactive });
  }

  /**
   * Get rules by field name (for quick lookups)
   */
  async getRulesByField(
    workspaceId: string,
    objectName: string,
    fieldName: string,
    fieldRole: 'controlling' | 'dependent',
  ): Promise<DependentFieldRule[]> {
    const query: DependentFieldRuleQuery = {
      objectName,
      includeInactive: false,
    };

    if (fieldRole === 'controlling') {
      query.controllingField = fieldName;
    } else {
      query.dependentField = fieldName;
    }

    return this.getRules(workspaceId, query);
  }

  /**
   * Get statistics for monitoring
   */
  async getStats(workspaceId: string): Promise<DependentFieldStats> {
    const allRules = await this.getRules(workspaceId, { includeInactive: true });
    const activeRules = allRules.filter((rule) => rule.isActive);

    const rulesByType = allRules.reduce(
      (acc, rule) => {
        acc[rule.type] = (acc[rule.type] || 0) + 1;
        return acc;
      },
      {} as Record<'values' | 'visibility', number>,
    );

    const lastUpdated =
      allRules.length > 0
        ? new Date(
            Math.max(...allRules.map((rule) => rule.updatedAt.getTime())),
          )
        : undefined;

    return {
      totalRules: allRules.length,
      activeRules: activeRules.length,
      rulesByType,
      lastUpdated,
    };
  }

  /**
   * Check if a rule exists for a specific field combination
   */
  async ruleExists(
    workspaceId: string,
    objectName: string,
    controllingField: string,
    dependentField: string,
  ): Promise<boolean> {
    const count = await this.dependentFieldRuleRepository.count({
      where: {
        workspaceId,
        objectName,
        controllingField,
        dependentField,
      },
    });

    return count > 0;
  }

  /**
   * Convert entity to domain model
   */
  private entityToRule(entity: DependentFieldRuleEntity): DependentFieldRule {
    return {
      id: entity.id,
      objectName: entity.objectName,
      controllingField: entity.controllingField,
      dependentField: entity.dependentField,
      type: entity.type,
      mappings: JSON.parse(entity.mappings) as DependentFieldMapping[],
      workspaceId: entity.workspaceId,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Validate mappings based on rule type
   */
  private validateMappings(
    mappings: DependentFieldMapping[],
    type: 'values' | 'visibility',
  ): void {
    if (!mappings || mappings.length === 0) {
      throw new Error('At least one mapping is required');
    }

    for (const mapping of mappings) {
      if (!mapping.controllingValue) {
        throw new Error('controllingValue is required for each mapping');
      }

      if (type === 'values' && !mapping.dependentValues) {
        throw new Error(
          'dependentValues is required for type="values" mappings',
        );
      }

      if (type === 'visibility' && mapping.visible === undefined) {
        throw new Error('visible is required for type="visibility" mappings');
      }
    }
  }
}
