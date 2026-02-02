import { gql } from '@apollo/client';
import { DEPENDENT_FIELD_RULE_FRAGMENT } from '../fragments/dependentFieldRuleFragment';

/**
 * Query a single dependent field rule by ID
 */
export const GET_DEPENDENT_FIELD_RULE = gql`
  ${DEPENDENT_FIELD_RULE_FRAGMENT}
  query GetDependentFieldRule($input: GetDependentFieldRuleInput!) {
    dependentFieldRule(input: $input) {
      ...DependentFieldRuleFields
    }
  }
`;
