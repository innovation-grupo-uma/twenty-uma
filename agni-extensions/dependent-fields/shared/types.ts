/**
 * Dependent Fields Extension - Shared Type Definitions
 *
 * This file defines the core types for the Dependent Fields system,
 * which enables dependent picklists and conditional field visibility.
 */

/**
 * Type of dependent field relationship
 * - 'values': Filters available options in the dependent field based on controlling field value
 * - 'visibility': Shows/hides the dependent field based on controlling field value
 */
export type DependentFieldRuleType = 'values' | 'visibility';

/**
 * Mapping between controlling field values and dependent field behavior
 */
export interface DependentFieldMapping {
  /**
   * Value(s) of the controlling field that trigger this mapping
   * Can be a single string or array of strings for multiple trigger values
   */
  controllingValue: string | string[];

  /**
   * For type='values': List of allowed values in the dependent field
   * When the controlling field matches controllingValue, only these options will be available
   */
  dependentValues?: string[];

  /**
   * For type='visibility': Whether the dependent field should be visible
   * When the controlling field matches controllingValue, field visibility is set to this value
   */
  visible?: boolean;
}

/**
 * Core rule defining a dependent field relationship
 */
export interface DependentFieldRule {
  /**
   * Unique identifier for the rule
   */
  id: string;

  /**
   * Name of the object this rule applies to (e.g., "Opportunity", "Contact")
   */
  objectName: string;

  /**
   * Name of the field that controls the dependent field
   * Changes to this field trigger evaluation of the dependent field
   */
  controllingField: string;

  /**
   * Name of the field that depends on the controlling field
   * This field's options or visibility will be affected by the rule
   */
  dependentField: string;

  /**
   * Type of dependency relationship
   */
  type: DependentFieldRuleType;

  /**
   * Array of mappings defining how controlling values affect the dependent field
   */
  mappings: DependentFieldMapping[];

  /**
   * Workspace ID for multi-tenant isolation
   * Each workspace has independent rule configurations
   */
  workspaceId: string;

  /**
   * Optional description of the rule for documentation
   */
  description?: string;

  /**
   * Whether the rule is active
   * Inactive rules are stored but not evaluated
   */
  isActive: boolean;

  /**
   * Timestamps for audit trail
   */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating a new dependent field rule
 */
export interface DependentFieldRuleInput {
  objectName: string;
  controllingField: string;
  dependentField: string;
  type: DependentFieldRuleType;
  mappings: DependentFieldMapping[];
  description?: string;
  isActive?: boolean;
}

/**
 * Input type for updating an existing dependent field rule
 */
export interface DependentFieldRuleUpdateInput {
  objectName?: string;
  controllingField?: string;
  dependentField?: string;
  type?: DependentFieldRuleType;
  mappings?: DependentFieldMapping[];
  description?: string;
  isActive?: boolean;
}

/**
 * Result of evaluating a dependent field rule for 'values' type
 */
export interface DependentFieldValuesResult {
  /**
   * Filtered list of available values for the dependent field
   * Empty array if no mapping matches the controlling value
   */
  availableValues: string[];

  /**
   * The rule that was applied (for debugging)
   */
  appliedRule?: DependentFieldRule;

  /**
   * Whether a default fallback was used (no matching mapping found)
   */
  isDefault: boolean;
}

/**
 * Result of evaluating a dependent field rule for 'visibility' type
 */
export interface DependentFieldVisibilityResult {
  /**
   * Whether the dependent field should be visible
   */
  isVisible: boolean;

  /**
   * The rule that was applied (for debugging)
   */
  appliedRule?: DependentFieldRule;

  /**
   * Whether a default fallback was used (no matching mapping found)
   */
  isDefault: boolean;
}

/**
 * Combined result for dependent field evaluation
 */
export interface DependentFieldEvaluationResult {
  /**
   * For type='values': filtered available values
   */
  availableValues?: string[];

  /**
   * For type='visibility': whether field should be visible
   */
  isVisible?: boolean;

  /**
   * The rule that was applied
   */
  appliedRule?: DependentFieldRule;

  /**
   * Whether evaluation succeeded
   */
  success: boolean;

  /**
   * Error message if evaluation failed
   */
  error?: string;
}

/**
 * Query parameters for fetching dependent field rules
 */
export interface DependentFieldRuleQuery {
  /**
   * Filter by object name
   */
  objectName?: string;

  /**
   * Filter by controlling field
   */
  controllingField?: string;

  /**
   * Filter by dependent field
   */
  dependentField?: string;

  /**
   * Filter by rule type
   */
  type?: DependentFieldRuleType;

  /**
   * Include inactive rules
   */
  includeInactive?: boolean;
}

/**
 * Cache key structure for Redis caching
 */
export interface DependentFieldCacheKey {
  workspaceId: string;
  objectName: string;
  fieldName: string;
}

/**
 * Configuration for dependent field evaluation behavior
 */
export interface DependentFieldConfig {
  /**
   * Redis cache TTL in seconds (default: 300 = 5 minutes)
   */
  cacheTTL: number;

  /**
   * Whether to fail open (show all options) or fail closed (show no options) on error
   * Default: true (fail open for better UX)
   */
  failOpen: boolean;

  /**
   * Enable debug logging
   */
  enableDebugLogging: boolean;
}

/**
 * Statistics for monitoring dependent field usage
 */
export interface DependentFieldStats {
  /**
   * Total number of rules in the workspace
   */
  totalRules: number;

  /**
   * Number of active rules
   */
  activeRules: number;

  /**
   * Rules by type
   */
  rulesByType: Record<DependentFieldRuleType, number>;

  /**
   * Most recently updated rule
   */
  lastUpdated?: Date;
}
