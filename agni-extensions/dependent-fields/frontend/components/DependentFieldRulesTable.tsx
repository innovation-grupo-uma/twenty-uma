import { useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { useMutation } from '@apollo/client';

import { Table } from '@/ui/layout/table/components/Table';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { IconTrash, IconPencil, IconToggleLeft, IconToggleRight } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { IconSearch } from 'twenty-ui/display';

import { DependentFieldRule } from '../../shared/types';
import { DELETE_DEPENDENT_FIELD_RULE } from '../graphql/mutations/deleteDependentFieldRule';
import { UPDATE_DEPENDENT_FIELD_RULE } from '../graphql/mutations/updateDependentFieldRule';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

const StyledTableRow = styled(TableRow)`
  grid-template-columns: 200px 150px 150px 100px 150px auto 120px;
`;

const StyledSearchInput = styled(SettingsTextInput)`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  width: 100%;
`;

const StyledActionsCell = styled(TableCell)`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  justify-content: flex-end;
`;

const StyledStatusBadge = styled.span<{ isActive: boolean }>`
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  background-color: ${({ theme, isActive }) =>
    isActive ? theme.color.green10 : theme.color.gray20};
  color: ${({ theme, isActive }) =>
    isActive ? theme.color.green70 : theme.color.gray60};
`;

const StyledTypeBadge = styled.span<{ type: 'values' | 'visibility' }>`
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  background-color: ${({ theme, type }) =>
    type === 'values' ? theme.color.blue10 : theme.color.purple10};
  color: ${({ theme, type }) =>
    type === 'values' ? theme.color.blue70 : theme.color.purple70};
`;

export type DependentFieldRulesTableProps = {
  rules: DependentFieldRule[];
  onEdit: (rule: DependentFieldRule) => void;
  onRefetch: () => void;
};

export const DependentFieldRulesTable = ({
  rules,
  onEdit,
  onRefetch,
}: DependentFieldRulesTableProps) => {
  const { t } = useLingui();
  const [searchTerm, setSearchTerm] = useState('');
  const [ruleToDelete, setRuleToDelete] = useState<DependentFieldRule | null>(
    null,
  );
  const { openModal, closeModal } = useModal();

  const [deleteDependentFieldRule] = useMutation(DELETE_DEPENDENT_FIELD_RULE, {
    onCompleted: () => {
      closeModal('delete-dependent-field-rule');
      setRuleToDelete(null);
      onRefetch();
    },
  });

  const [updateDependentFieldRule] = useMutation(UPDATE_DEPENDENT_FIELD_RULE, {
    onCompleted: () => {
      onRefetch();
    },
  });

  const filteredRules = useMemo(() => {
    if (!searchTerm) return rules;

    const searchNormalized = normalizeSearchText(searchTerm);

    return rules.filter((rule) => {
      return (
        normalizeSearchText(rule.objectName).includes(searchNormalized) ||
        normalizeSearchText(rule.controllingField).includes(searchNormalized) ||
        normalizeSearchText(rule.dependentField).includes(searchNormalized) ||
        (rule.description &&
          normalizeSearchText(rule.description).includes(searchNormalized))
      );
    });
  }, [rules, searchTerm]);

  const handleDeleteClick = (rule: DependentFieldRule) => {
    setRuleToDelete(rule);
    openModal('delete-dependent-field-rule');
  };

  const handleDeleteConfirm = () => {
    if (!ruleToDelete) return;

    deleteDependentFieldRule({
      variables: {
        input: {
          id: ruleToDelete.id,
        },
      },
    });
  };

  const handleToggleActive = (rule: DependentFieldRule) => {
    updateDependentFieldRule({
      variables: {
        input: {
          id: rule.id,
          isActive: !rule.isActive,
        },
      },
    });
  };

  return (
    <>
      <StyledSearchInput
        instanceId="dependent-field-rules-search"
        LeftIcon={IconSearch}
        placeholder={t`Search rules...`}
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <Table>
        <StyledTableRow>
          <TableHeader>{t`Object`}</TableHeader>
          <TableHeader>{t`Controlling Field`}</TableHeader>
          <TableHeader>{t`Dependent Field`}</TableHeader>
          <TableHeader>{t`Type`}</TableHeader>
          <TableHeader>{t`Status`}</TableHeader>
          <TableHeader>{t`Description`}</TableHeader>
          <TableHeader>{t`Actions`}</TableHeader>
        </StyledTableRow>
        <TableBody>
          {filteredRules.map((rule) => (
            <StyledTableRow key={rule.id}>
              <TableCell>{rule.objectName}</TableCell>
              <TableCell>{rule.controllingField}</TableCell>
              <TableCell>{rule.dependentField}</TableCell>
              <TableCell>
                <StyledTypeBadge type={rule.type}>
                  {rule.type === 'values' ? t`Values` : t`Visibility`}
                </StyledTypeBadge>
              </TableCell>
              <TableCell>
                <StyledStatusBadge isActive={rule.isActive}>
                  {rule.isActive ? t`Active` : t`Inactive`}
                </StyledStatusBadge>
              </TableCell>
              <TableCell>{rule.description || '-'}</TableCell>
              <StyledActionsCell>
                <Button
                  Icon={rule.isActive ? IconToggleRight : IconToggleLeft}
                  size="small"
                  variant="tertiary"
                  accent="default"
                  onClick={() => handleToggleActive(rule)}
                  ariaLabel={
                    rule.isActive
                      ? t`Deactivate rule`
                      : t`Activate rule`
                  }
                />
                <Button
                  Icon={IconPencil}
                  size="small"
                  variant="tertiary"
                  accent="default"
                  onClick={() => onEdit(rule)}
                  ariaLabel={t`Edit rule`}
                />
                <Button
                  Icon={IconTrash}
                  size="small"
                  variant="tertiary"
                  accent="danger"
                  onClick={() => handleDeleteClick(rule)}
                  ariaLabel={t`Delete rule`}
                />
              </StyledActionsCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>

      {filteredRules.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          {searchTerm
            ? t`No rules found matching your search.`
            : t`No dependent field rules configured yet.`}
        </div>
      )}

      <ConfirmationModal
        isOpen={openModal === 'delete-dependent-field-rule'}
        onClose={() => {
          closeModal('delete-dependent-field-rule');
          setRuleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t`Delete Dependent Field Rule`}
        subtitle={t`Are you sure you want to delete this rule? This action cannot be undone.`}
        deleteButtonText={t`Delete`}
      />
    </>
  );
};
