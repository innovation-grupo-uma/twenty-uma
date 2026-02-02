import { gql } from '@apollo/client';

/**
 * GraphQL fragment for dependent field rule fields
 */
export const DEPENDENT_FIELD_RULE_FRAGMENT = gql`
  fragment DependentFieldRuleFields on DependentFieldRuleEntity {
    id
    workspaceId
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
`;
