import { useEffect, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { gql, useQuery } from '@apollo/client';

import { dependentFieldRulesState } from '../states/dependentFieldRulesState';
import {
  DependentFieldRule,
  DependentFieldMapping,
  DependentFieldEvaluationResult,
} from '../../shared/types';

/**
 * GraphQL query to fetch dependent field rules
 */
const GET_DEPENDENT_FIELD_RULES = gql`
  query GetDependentFieldRules($input: GetDependentFieldRulesInput) {
    dependentFieldRules(input: $input) {
      id
      objectName
      controllingField
      dependentField
      type
      mappings
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

/**
 * Hook for managing dependent field behavior
 *
 * @param objectName - Name of the object (e.g., "Opportunity")
 * @param fieldName - Name of the dependent field
 * @param controllingValue - Current value of the controlling field
 * @returns Evaluation result with available values and visibility
 */
export const useDependentFields = (
  objectName: string,
  fieldName: string,
  controllingValue: any,
): DependentFieldEvaluationResult & { loading: boolean; refetch: () => void } => {
  // Global state cache for rules
  const [rulesCache, setRulesCache] = useRecoilState(dependentFieldRulesState);

  // Query rules for this object
  const { data, loading, refetch } = useQuery(GET_DEPENDENT_FIELD_RULES, {
    variables: {
      input: {
        objectName,
        dependentField: fieldName,
        includeInactive: false,
      },
    },
    skip: !objectName || !fieldName,
  });

  // Update cache when data arrives
  useEffect(() => {
    if (data?.dependentFieldRules) {
      const rules = data.dependentFieldRules.map((rule: any) => ({
        ...rule,
        mappings: JSON.parse(rule.mappings) as DependentFieldMapping[],
      }));

      setRulesCache((prev) => ({
        ...prev,
        [`${objectName}.${fieldName}`]: rules,
      }));
    }
  }, [data, objectName, fieldName, setRulesCache]);

  // Get rules from cache
  const rules = useMemo<DependentFieldRule[]>(() => {
    return rulesCache[`${objectName}.${fieldName}`] || [];
  }, [rulesCache, objectName, fieldName]);

  // Evaluate rules
  const evaluationResult = useMemo<DependentFieldEvaluationResult>(() => {
    if (rules.length === 0) {
      return {
        success: true,
        isVisible: true,
        availableValues: [],
      };
    }

    const result: DependentFieldEvaluationResult = {
      success: true,
    };

    // Evaluate values rules
    const valuesRules = rules.filter((rule) => rule.type === 'values');
    if (valuesRules.length > 0) {
      const valuesResult = evaluateValuesRule(valuesRules[0], controllingValue);
      result.availableValues = valuesResult.availableValues;
      result.appliedRule = valuesResult.appliedRule;
    }

    // Evaluate visibility rules
    const visibilityRules = rules.filter((rule) => rule.type === 'visibility');
    if (visibilityRules.length > 0) {
      const visibilityResult = evaluateVisibilityRule(
        visibilityRules[0],
        controllingValue,
      );
      result.isVisible = visibilityResult.isVisible;
      result.appliedRule = result.appliedRule || visibilityResult.appliedRule;
    } else {
      // No visibility rule, default to visible
      result.isVisible = true;
    }

    return result;
  }, [rules, controllingValue]);

  return {
    ...evaluationResult,
    loading,
    refetch,
  };
};

/**
 * Evaluate a values-type rule
 */
function evaluateValuesRule(
  rule: DependentFieldRule,
  controllingValue: any,
): {
  availableValues: string[];
  appliedRule?: DependentFieldRule;
} {
  const matching = findMatchingMapping(rule.mappings, controllingValue);

  if (!matching || !matching.dependentValues) {
    return {
      availableValues: [],
    };
  }

  return {
    availableValues: matching.dependentValues,
    appliedRule: rule,
  };
}

/**
 * Evaluate a visibility-type rule
 */
function evaluateVisibilityRule(
  rule: DependentFieldRule,
  controllingValue: any,
): {
  isVisible: boolean;
  appliedRule?: DependentFieldRule;
} {
  const matching = findMatchingMapping(rule.mappings, controllingValue);

  if (!matching || matching.visible === undefined) {
    return {
      isVisible: true,
    };
  }

  return {
    isVisible: matching.visible,
    appliedRule: rule,
  };
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
