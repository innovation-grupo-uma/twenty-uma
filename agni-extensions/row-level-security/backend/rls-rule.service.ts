import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RLSRuleEntity } from '../../../packages/twenty-server/src/engine/metadata-modules/row-level-security/rls-rule.entity';
import {
  CreateRLSRuleInput,
  UpdateRLSRuleInput,
} from '../shared/types';

/**
 * RLS Rule Service
 * Agni CRM Extension - Row-Level Security
 * 
 * Handles CRUD operations for RLS rules
 */
@Injectable()
export class RLSRuleService {
  constructor(
    @InjectRepository(RLSRuleEntity)
    private readonly rlsRuleRepository: Repository<RLSRuleEntity>,
  ) {}

  /**
   * Create a new RLS rule
   */
  async createRule(input: CreateRLSRuleInput): Promise<RLSRuleEntity> {
    const rule = this.rlsRuleRepository.create({
      workspaceId: input.workspaceId,
      objectMetadataId: input.objectMetadataId,
      name: input.name,
      description: input.description || null,
      effect: input.effect,
      operations: input.operations,
      expression: input.expression,
      priority: input.priority,
      roleIds: input.roleIds,
      isActive: true,
    });

    return await this.rlsRuleRepository.save(rule);
  }

  /**
   * Get a rule by ID
   */
  async getRule(id: string): Promise<RLSRuleEntity | null> {
    return await this.rlsRuleRepository.findOne({
      where: { id },
      relations: ['workspace', 'objectMetadata'],
    });
  }

  /**
   * Get all rules for an object
   */
  async getRulesByObject(
    objectMetadataId: string,
  ): Promise<RLSRuleEntity[]> {
    return await this.rlsRuleRepository.find({
      where: { objectMetadataId, isActive: true },
      order: { priority: 'DESC' },
      relations: ['workspace', 'objectMetadata'],
    });
  }

  /**
   * Get all rules for a workspace
   */
  async getRulesByWorkspace(
    workspaceId: string,
  ): Promise<RLSRuleEntity[]> {
    return await this.rlsRuleRepository.find({
      where: { workspaceId },
      order: { priority: 'DESC' },
      relations: ['objectMetadata'],
    });
  }

  /**
   * Update an existing rule
   */
  async updateRule(
    id: string,
    input: UpdateRLSRuleInput,
  ): Promise<RLSRuleEntity> {
    const rule = await this.rlsRuleRepository.findOne({ where: { id } });

    if (!rule) {
      throw new Error(`RLS Rule with ID ${id} not found`);
    }

    // Update only provided fields
    if (input.name !== undefined) rule.name = input.name;
    if (input.description !== undefined) rule.description = input.description;
    if (input.effect !== undefined) rule.effect = input.effect;
    if (input.operations !== undefined) rule.operations = input.operations;
    if (input.expression !== undefined) rule.expression = input.expression;
    if (input.priority !== undefined) rule.priority = input.priority;
    if (input.isActive !== undefined) rule.isActive = input.isActive;
    if (input.roleIds !== undefined) rule.roleIds = input.roleIds;

    return await this.rlsRuleRepository.save(rule);
  }

  /**
   * Delete a rule (soft delete by marking as inactive)
   */
  async deleteRule(id: string): Promise<boolean> {
    const result = await this.rlsRuleRepository.update(id, {
      isActive: false,
    });

    return result.affected === 1;
  }

  /**
   * Hard delete a rule (permanently remove from database)
   */
  async hardDeleteRule(id: string): Promise<boolean> {
    const result = await this.rlsRuleRepository.delete(id);

    return result.affected === 1;
  }

  /**
   * Get rules by role IDs
   */
  async getRulesByRoles(roleIds: string[]): Promise<RLSRuleEntity[]> {
    return await this.rlsRuleRepository
      .createQueryBuilder('rule')
      .where('rule.isActive = :isActive', { isActive: true })
      .andWhere('rule.roleIds && :roleIds', { roleIds })
      .orderBy('rule.priority', 'DESC')
      .getMany();
  }
}
