import { useState } from 'react';
import { useQuery } from '@apollo/client';
import styled from '@emotion/styled';
import { Trans, useLingui } from '@lingui/react/macro';

import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';
import { Button } from 'twenty-ui/input';
import { H2Title, IconPlus } from 'twenty-ui/display';
import { Section } from 'twenty-ui/layout';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { DependentFieldRule, DependentFieldMapping } from '../../shared/types';
import { GET_DEPENDENT_FIELD_RULES } from '../graphql/queries/getDependentFieldRules';
import { DependentFieldRulesTable } from './DependentFieldRulesTable';
import { DependentFieldRuleForm } from './DependentFieldRuleForm';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
`;

const StyledEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(8)};
  text-align: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledEmptyStateTitle = styled.h3`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const StyledEmptyStateDescription = styled.p`
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.font.color.secondary};
  margin: 0;
  max-width: 500px;
`;

export const DependentFieldsConfig = () => {
  const { t } = useLingui();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<DependentFieldRule | undefined>(
    undefined,
  );

  const { data, loading, refetch } = useQuery(GET_DEPENDENT_FIELD_RULES, {
    variables: {
      input: {
        includeInactive: true,
      },
    },
  });

  const rules: DependentFieldRule[] = (data?.dependentFieldRules || []).map(
    (rule: any) => ({
      ...rule,
      mappings: JSON.parse(rule.mappings) as DependentFieldMapping[],
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt),
    }),
  );

  const handleAddRule = () => {
    setEditingRule(undefined);
    setShowForm(true);
  };

  const handleEditRule = (rule: DependentFieldRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRule(undefined);
  };

  const handleSuccess = () => {
    refetch();
  };

  return (
    <SubMenuTopBarContainer
      title={t`Dependent Fields`}
      actionButton={
        !showForm && (
          <Button
            Icon={IconPlus}
            title={t`Add Rule`}
            accent="blue"
            size="small"
            onClick={handleAddRule}
          />
        )
      }
      links={[
        {
          children: <Trans>Workspace</Trans>,
          href: getSettingsPath(SettingsPath.Workspace),
        },
        {
          children: <Trans>Data Model</Trans>,
          href: getSettingsPath(SettingsPath.Objects),
        },
        { children: <Trans>Dependent Fields</Trans> },
      ]}
    >
      <SettingsPageContainer>
        <StyledContainer>
          {showForm ? (
            <DependentFieldRuleForm
              rule={editingRule}
              onClose={handleCloseForm}
              onSuccess={handleSuccess}
            />
          ) : (
            <>
              <Section>
                <H2Title
                  title={t`Dependent Field Rules`}
                  description={t`Configure field dependencies to control which options are available or whether fields are visible based on other field values.`}
                />

                {loading ? (
                  <div>{t`Loading rules...`}</div>
                ) : rules.length === 0 ? (
                  <StyledEmptyState>
                    <StyledEmptyStateTitle>
                      {t`No Dependent Field Rules Yet`}
                    </StyledEmptyStateTitle>
                    <StyledEmptyStateDescription>
                      {t`Create your first rule to control field visibility or filter available options based on other field values. For example, show different states based on the selected country.`}
                    </StyledEmptyStateDescription>
                    <Button
                      Icon={IconPlus}
                      title={t`Create First Rule`}
                      accent="blue"
                      size="medium"
                      onClick={handleAddRule}
                    />
                  </StyledEmptyState>
                ) : (
                  <DependentFieldRulesTable
                    rules={rules}
                    onEdit={handleEditRule}
                    onRefetch={refetch}
                  />
                )}
              </Section>
            </>
          )}
        </StyledContainer>
      </SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
};
