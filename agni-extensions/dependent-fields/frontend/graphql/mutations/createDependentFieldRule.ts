import { gql } from '@apollo/client';
import { DEPENDENT_FIELD_RULE_FRAGMENT } from '../fragments/dependentFieldRuleFragment';

/**
 * Mutation to create a new dependent field rule
 */
export const CREATE_DEPENDENT_FIELD_RULE = gql`
  ${DEPENDENT_FIELD_RULE_FRAGMENT}
  mutation CreateDependentFieldRule($input: CreateDependentFieldRuleInput!) {
    createDependentFieldRule(input: $input) {
      ...DependentFieldRuleFields
    }
  }
`;
