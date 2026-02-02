import { atom } from 'recoil';
import { DependentFieldRule } from '../../shared/types';

/**
 * Recoil atom for caching dependent field rules
 *
 * Key format: `${objectName}.${fieldName}`
 * Value: Array of DependentFieldRule applicable to that field
 *
 * This cache minimizes GraphQL queries by storing rules in memory.
 * Rules are fetched once per field and cached for the session.
 */
export const dependentFieldRulesState = atom<
  Record<string, DependentFieldRule[]>
>({
  key: 'dependentFieldRulesState',
  default: {},
});
