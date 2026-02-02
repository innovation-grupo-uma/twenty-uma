import { gql } from '@apollo/client';

/**
 * Mutation to delete a dependent field rule
 */
export const DELETE_DEPENDENT_FIELD_RULE = gql`
  mutation DeleteDependentFieldRule($input: DeleteDependentFieldRuleInput!) {
    deleteDependentFieldRule(input: $input)
  }
`;
