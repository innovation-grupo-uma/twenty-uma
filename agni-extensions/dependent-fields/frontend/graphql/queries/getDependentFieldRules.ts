import { gql } from '@apollo/client';
import { DEPENDENT_FIELD_RULE_FRAGMENT } from '../fragments/dependentFieldRuleFragment';

/**
 * Query all dependent field rules for the workspace
 */
export const GET_DEPENDENT_FIELD_RULES = gql`
  ${DEPENDENT_FIELD_RULE_FRAGMENT}
  query GetDependentFieldRules($input: GetDependentFieldRulesInput) {
    dependentFieldRules(input: $input) {
      ...DependentFieldRuleFields
    }
  }
`;
