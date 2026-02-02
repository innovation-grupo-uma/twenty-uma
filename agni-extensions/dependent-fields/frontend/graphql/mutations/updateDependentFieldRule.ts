import { gql } from '@apollo/client';
import { DEPENDENT_FIELD_RULE_FRAGMENT } from '../fragments/dependentFieldRuleFragment';

/**
 * Mutation to update an existing dependent field rule
 */
export const UPDATE_DEPENDENT_FIELD_RULE = gql`
  ${DEPENDENT_FIELD_RULE_FRAGMENT}
  mutation UpdateDependentFieldRule($input: UpdateDependentFieldRuleInput!) {
    updateDependentFieldRule(input: $input) {
      ...DependentFieldRuleFields
    }
  }
`;
