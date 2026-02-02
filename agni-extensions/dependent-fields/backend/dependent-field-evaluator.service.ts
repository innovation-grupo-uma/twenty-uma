import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

import {
  DependentFieldRule,
  DependentFieldMapping,
  DependentFieldValuesResult,
  DependentFieldVisibilityResult,
  DependentFieldEvaluationResult,
  DependentFieldCacheKey,
  DependentFieldConfig,
} from '../shared/types';
import { DependentFieldMetadataService } from './dependent-field-metadata.service';

/**
 * Service for evaluating dependent field rules at runtime
 *
 * Handles the logic of determining which values are available for a dependent field
 * or whether it should be visible, based on the current value of the controlling field.
 *
 * Features:
 * - Redis caching for performance
 * - Graceful degradation on errors
 * - Support for multi-value controlling fields
 */
@Injectable()
export class DependentFieldEvaluatorService {
  private readonly logger = new Logger(DependentFieldEvaluatorService.name);

  private readonly config: DependentFieldConfig = {
    cacheTTL: 300, // 5 minutes
    failOpen: true, // Show all options on error
    enableDebugLogging: false,
  };

  constructor(
    private readonly metadataService: DependentFieldMetadataService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Evaluate a 'values' type rule to get filtered options
   */
  async evaluateValues(
    workspaceId: string,
    objectName: string,
    dependentField: string,
    controllingFieldValue: any,
  ): Promise<DependentFieldValuesResult> {
    try {
      // Get rules for this field combination
      const rules = await this.getRulesWithCache(
        workspaceId,
        objectName,
        dependentField,
      );

      const valuesRules = rules.filter((rule) => rule.type === 'values');

      if (valuesRules.length === 0) {
        // No rules defined, return empty (let caller handle default)
        return {
          availableValues: [],
          isDefault: true,
        };
      }

      // Use the first matching rule (could be extended to support multiple rules)
      const rule = valuesRules[0];

      // Find matching mapping
      const matching = this.findMatchingMapping(
        rule.mappings,
        controllingFieldValue,
      );

      if (!matching || !matching.dependentValues) {
        // No matching mapping found, return empty array
        this.logger.debug(
          `No matching mapping for ${objectName}.${dependentField} with controlling value: ${controllingFieldValue}`,
        );
        return {
          availableValues: [],
          appliedRule: rule,
          isDefault: true,
        };
      }

      return {
        availableValues: matching.dependentValues,
        appliedRule: rule,
        isDefault: false,
      };
    } catch (error) {
      this.logger.error(
        `Error evaluating values for ${objectName}.${dependentField}: ${error.message}`,
        error.stack,
      );

      // Fail open: return empty array and let caller show all options
      if (this.config.failOpen) {
        return {
          availableValues: [],
          isDefault: true,
        };
      }

      throw error;
    }
  }

  /**
   * Evaluate a 'visibility' type rule to determine if field should be visible
   */
  async evaluateVisibility(
    workspaceId: string,
    objectName: string,
    dependentField: string,
    controllingFieldValue: any,
  ): Promise<DependentFieldVisibilityResult> {
    try {
      // Get rules for this field combination
      const rules = await this.getRulesWithCache(
        workspaceId,
        objectName,
        dependentField,
      );

      const visibilityRules = rules.filter((rule) => rule.type === 'visibility');

      if (visibilityRules.length === 0) {
        // No rules defined, default to visible
        return {
          isVisible: true,
          isDefault: true,
        };
      }

      // Use the first matching rule
      const rule = visibilityRules[0];

      // Find matching mapping
      const matching = this.findMatchingMapping(
        rule.mappings,
        controllingFieldValue,
      );

      if (!matching || matching.visible === undefined) {
        // No matching mapping found, default to visible
        this.logger.debug(
          `No matching mapping for ${objectName}.${dependentField} with controlling value: ${controllingFieldValue}`,
        );
        return {
          isVisible: true,
          appliedRule: rule,
          isDefault: true,
        };
      }

      return {
        isVisible: matching.visible,
        appliedRule: rule,
        isDefault: false,
      };
    } catch (error) {
      this.logger.error(
        `Error evaluating visibility for ${objectName}.${dependentField}: ${error.message}`,
        error.stack,
      );

      // Fail open: default to visible
      if (this.config.failOpen) {
        return {
          isVisible: true,
          isDefault: true,
        };
      }

      throw error;
    }
  }

  /**
   * Unified evaluation method that handles both types
   */
  async evaluate(
    workspaceId: string,
    objectName: string,
    dependentField: string,
    controllingFieldValue: any,
    type?: 'values' | 'visibility',
  ): Promise<DependentFieldEvaluationResult> {
    try {
      const rules = await this.getRulesWithCache(
        workspaceId,
        objectName,
        dependentField,
      );

      // Filter by type if specified
      const filteredRules = type
        ? rules.filter((rule) => rule.type === type)
        : rules;

      if (filteredRules.length === 0) {
        return {
          success: true,
          availableValues: [],
          isVisible: true,
        };
      }

      const result: DependentFieldEvaluationResult = {
        success: true,
      };

      // Evaluate values rules
      const valuesRules = filteredRules.filter((rule) => rule.type === 'values');
      if (valuesRules.length > 0) {
        const valuesResult = await this.evaluateValuesFromRule(
          valuesRules[0],
          controllingFieldValue,
        );
        result.availableValues = valuesResult.availableValues;
        result.appliedRule = valuesResult.appliedRule;
      }

      // Evaluate visibility rules
      const visibilityRules = filteredRules.filter(
        (rule) => rule.type === 'visibility',
      );
      if (visibilityRules.length > 0) {
        const visibilityResult = await this.evaluateVisibilityFromRule(
          visibilityRules[0],
          controllingFieldValue,
        );
        result.isVisible = visibilityResult.isVisible;
        result.appliedRule = result.appliedRule || visibilityResult.appliedRule;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error in unified evaluation for ${objectName}.${dependentField}: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.message,
        availableValues: [],
        isVisible: true,
      };
    }
  }

  /**
   * Invalidate cache for a specific field
   */
  async invalidateCache(
    workspaceId: string,
    objectName: string,
    fieldName: string,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey({ workspaceId, objectName, fieldName });
    await this.redis.del(cacheKey);
    this.logger.debug(`Invalidated cache for key: ${cacheKey}`);
  }

  /**
   * Invalidate all cache for a workspace
   */
  async invalidateWorkspaceCache(workspaceId: string): Promise<void> {
    const pattern = this.buildCacheKey({ workspaceId, objectName: '*', fieldName: '*' });
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.debug(`Invalidated ${keys.length} cache keys for workspace ${workspaceId}`);
    }
  }

  /**
   * Get rules with Redis caching
   */
  private async getRulesWithCache(
    workspaceId: string,
    objectName: string,
    fieldName: string,
  ): Promise<DependentFieldRule[]> {
    const cacheKey = this.buildCacheKey({ workspaceId, objectName, fieldName });

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      if (this.config.enableDebugLogging) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
      }
      return JSON.parse(cached) as DependentFieldRule[];
    }

    // Cache miss, fetch from database
    if (this.config.enableDebugLogging) {
      this.logger.debug(`Cache miss for key: ${cacheKey}`);
    }

    const rules = await this.metadataService.getRulesByField(
      workspaceId,
      objectName,
      fieldName,
      'dependent',
    );

    // Store in cache
    await this.redis.setex(
      cacheKey,
      this.config.cacheTTL,
      JSON.stringify(rules),
    );

    return rules;
  }

  /**
   * Evaluate values from a specific rule
   */
  private async evaluateValuesFromRule(
    rule: DependentFieldRule,
    controllingFieldValue: any,
  ): Promise<DependentFieldValuesResult> {
    const matching = this.findMatchingMapping(
      rule.mappings,
      controllingFieldValue,
    );

    if (!matching || !matching.dependentValues) {
      return {
        availableValues: [],
        appliedRule: rule,
        isDefault: true,
      };
    }

    return {
      availableValues: matching.dependentValues,
      appliedRule: rule,
      isDefault: false,
    };
  }

  /**
   * Evaluate visibility from a specific rule
   */
  private async evaluateVisibilityFromRule(
    rule: DependentFieldRule,
    controllingFieldValue: any,
  ): Promise<DependentFieldVisibilityResult> {
    const matching = this.findMatchingMapping(
      rule.mappings,
      controllingFieldValue,
    );

    if (!matching || matching.visible === undefined) {
      return {
        isVisible: true,
        appliedRule: rule,
        isDefault: true,
      };
    }

    return {
      isVisible: matching.visible,
      appliedRule: rule,
      isDefault: false,
    };
  }

  /**
   * Find a mapping that matches the controlling field value
   */
  private findMatchingMapping(
    mappings: DependentFieldMapping[],
    controllingValue: any,
  ): DependentFieldMapping | undefined {
    // Normalize controlling value to string for comparison
    const normalizedValue = this.normalizeValue(controllingValue);

    return mappings.find((mapping) => {
      if (Array.isArray(mapping.controllingValue)) {
        // Multiple trigger values
        return mapping.controllingValue.some(
          (val) => this.normalizeValue(val) === normalizedValue,
        );
      } else {
        // Single trigger value
        return (
          this.normalizeValue(mapping.controllingValue) === normalizedValue
        );
      }
    });
  }

  /**
   * Normalize a value for comparison
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).toLowerCase().trim();
  }

  /**
   * Build Redis cache key
   */
  private buildCacheKey(key: DependentFieldCacheKey): string {
    return `dependent-field:${key.workspaceId}:${key.objectName}:${key.fieldName}`;
  }

  /**
   * Update configuration (useful for testing)
   */
  setConfig(config: Partial<DependentFieldConfig>): void {
    Object.assign(this.config, config);
  }
}
