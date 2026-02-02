import { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { type SelectOption } from 'twenty-ui/input';

import { DependentFieldRule, DependentFieldMapping } from '../../shared/types';

/**
 * GraphQL query to fetch dependent field rules
 */
const GET_DEPENDENT_FIELD_RULES = gql`
  query GetDependentFieldRulesForSelect($input: GetDependentFieldRulesInput) {
    dependentFieldRules(input: $input) {
      id
      objectName
      controllingField
      dependentField
      type
      mappings
      isActive
    }
  }
`;

export type UseSelectFieldWithDependentRulesResult = {
  /**
   * Filtered options based on dependent field rules
   */
  options: SelectOption[];
  /**
   * Whether the field should be visible
   */
  isVisible: boolean;
  /**
   * Whether rules are being loaded
   */
  loading: boolean;
  /**
   * Name of the controlling field (if any)
   */
  controllingFieldName?: string;
  /**
   * Whether dependent field rules apply to this field
   */
  hasDependentRules: boolean;
};

/**
 * Hook for SELECT fields that automatically applies dependent field rules
 *
 * @param objectName - Name of the object (e.g., "Opportunity")
 * @param fieldName - Name of the dependent SELECT field
 * @param allOptions - All available options for the field
 * @param record - The current record data
 * @returns Filtered options and visibility based on dependent field rules
 */
export const useSelectFieldWithDependentRules = (
  objectName: string,
  fieldName: string,
  allOptions: SelectOption[],
  record: Record<string, any> | undefined,
): UseSelectFieldWithDependentRulesResult => {
  // Query rules for this field
  const { data, loading } = useQuery(GET_DEPENDENT_FIELD_RULES, {
    variables: {
      input: {
        objectName,
        dependentField: fieldName,
        includeInactive: false,
      },
    },
    skip: !objectName || !fieldName,
  });

  // Parse and evaluate rules
  const result = useMemo<UseSelectFieldWithDependentRulesResult>(() => {
    // If no rules or still loading, return all options
    if (!data?.dependentFieldRules || data.dependentFieldRules.length === 0) {
      return {
        options: allOptions,
        isVisible: true,
        loading,
        hasDependentRules: false,
      };
    }

    const rules: DependentFieldRule[] = data.dependentFieldRules.map(
      (rule: any) => ({
        ...rule,
        mappings: JSON.parse(rule.mappings) as DependentFieldMapping[],
      }),
    );

    // Get controlling field name from first rule
    const controllingFieldName = rules[0]?.controllingField;

    // If no record data yet, return all options (graceful degradation)
    if (!record || !controllingFieldName) {
      return {
        options: allOptions,
        isVisible: true,
        loading,
        controllingFieldName,
        hasDependentRules: true,
      };
    }

    // Get controlling field value from record
    const controllingValue = record[controllingFieldName];

    // Evaluate visibility rules
    const visibilityRules = rules.filter((rule) => rule.type === 'visibility');
    let isVisible = true;

    if (visibilityRules.length > 0) {
      const visibilityResult = evaluateVisibilityRule(
        visibilityRules[0],
        controllingValue,
      );
      isVisible = visibilityResult;
    }

    // Evaluate values rules
    const valuesRules = rules.filter((rule) => rule.type === 'values');
    let filteredOptions = allOptions;

    if (valuesRules.length > 0) {
      const availableValues = evaluateValuesRule(
        valuesRules[0],
        controllingValue,
      );

      // Filter options to only include available values
      if (availableValues.length > 0) {
        filteredOptions = allOptions.filter((option) =>
          availableValues.includes(option.value),
        );
      }
    }

    return {
      options: filteredOptions,
      isVisible,
      loading,
      controllingFieldName,
      hasDependentRules: true,
    };
  }, [data, allOptions, record, loading, objectName, fieldName]);

  return result;
};

/**
 * Evaluate a visibility-type rule
 */
function evaluateVisibilityRule(
  rule: DependentFieldRule,
  controllingValue: any,
): boolean {
  const matching = findMatchingMapping(rule.mappings, controllingValue);

  if (!matching || matching.visible === undefined) {
    return true; // Default to visible
  }

  return matching.visible;
}

/**
 * Evaluate a values-type rule
 */
function evaluateValuesRule(
  rule: DependentFieldRule,
  controllingValue: any,
): string[] {
  const matching = findMatchingMapping(rule.mappings, controllingValue);

  if (!matching || !matching.dependentValues) {
    return [];
  }

  return matching.dependentValues;
}

/**
 * Find a mapping that matches the controlling value
 */
function findMatchingMapping(
  mappings: DependentFieldMapping[],
  controllingValue: any,
): DependentFieldMapping | undefined {
  const normalizedValue = normalizeValue(controllingValue);

  return mappings.find((mapping) => {
    if (Array.isArray(mapping.controllingValue)) {
      return mapping.controllingValue.some(
        (val) => normalizeValue(val) === normalizedValue,
      );
    } else {
      return normalizeValue(mapping.controllingValue) === normalizedValue;
    }
  });
}

/**
 * Normalize a value for comparison
 */
function normalizeValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).toLowerCase().trim();
}
