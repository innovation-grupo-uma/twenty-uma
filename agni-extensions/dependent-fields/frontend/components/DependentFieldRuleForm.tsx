import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { useMutation } from '@apollo/client';
import { Button } from 'twenty-ui/input';
import { IconCheck, IconX } from 'twenty-ui/display';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';

import {
  DependentFieldRule,
  DependentFieldMapping,
  DependentFieldRuleInput,
} from '../../shared/types';
import { CREATE_DEPENDENT_FIELD_RULE } from '../graphql/mutations/createDependentFieldRule';
import { UPDATE_DEPENDENT_FIELD_RULE } from '../graphql/mutations/updateDependentFieldRule';
import { DependentFieldRuleMappingEditor } from './DependentFieldRuleMappingEditor';

const StyledFormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};
  background-color: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const StyledFormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing(3)};
`;

const StyledFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledLabel = styled.label`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledSelect = styled.select`
  padding: ${({ theme }) => theme.spacing(2)};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: ${({ theme }) => theme.font.size.md};
  background-color: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.font.color.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  justify-content: flex-end;
`;

const StyledSectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

export type DependentFieldRuleFormProps = {
  rule?: DependentFieldRule;
  onClose: () => void;
  onSuccess: () => void;
};

export const DependentFieldRuleForm = ({
  rule,
  onClose,
  onSuccess,
}: DependentFieldRuleFormProps) => {
  const { t } = useLingui();
  const { objectMetadataItems } = useFilteredObjectMetadataItems();

  const [formData, setFormData] = useState<DependentFieldRuleInput>({
    objectName: rule?.objectName || '',
    controllingField: rule?.controllingField || '',
    dependentField: rule?.dependentField || '',
    type: rule?.type || 'values',
    mappings: rule?.mappings || [],
    description: rule?.description || '',
    isActive: rule?.isActive ?? true,
  });

  const [selectedObject, setSelectedObject] = useState(formData.objectName);

  const [createDependentFieldRule, { loading: creating }] = useMutation(
    CREATE_DEPENDENT_FIELD_RULE,
    {
      onCompleted: () => {
        onSuccess();
        onClose();
      },
    },
  );

  const [updateDependentFieldRule, { loading: updating }] = useMutation(
    UPDATE_DEPENDENT_FIELD_RULE,
    {
      onCompleted: () => {
        onSuccess();
        onClose();
      },
    },
  );

  const loading = creating || updating;

  const selectedObjectMetadata = objectMetadataItems.find(
    (obj) => obj.nameSingular === selectedObject,
  );

  const availableFields = selectedObjectMetadata?.fields.filter(
    (field) => !field.isSystem,
  ) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rule) {
      // Update existing rule
      updateDependentFieldRule({
        variables: {
          input: {
            id: rule.id,
            ...formData,
            // Convert mappings to format expected by backend
            mappings: formData.mappings.map((mapping) => ({
              controllingValue: Array.isArray(mapping.controllingValue)
                ? mapping.controllingValue
                : [mapping.controllingValue],
              dependentValues: mapping.dependentValues,
              visible: mapping.visible,
            })),
          },
        },
      });
    } else {
      // Create new rule
      createDependentFieldRule({
        variables: {
          input: {
            ...formData,
            // Convert mappings to format expected by backend
            mappings: formData.mappings.map((mapping) => ({
              controllingValue: Array.isArray(mapping.controllingValue)
                ? mapping.controllingValue
                : [mapping.controllingValue],
              dependentValues: mapping.dependentValues,
              visible: mapping.visible,
            })),
          },
        },
      });
    }
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, objectName: selectedObject }));
  }, [selectedObject]);

  const isFormValid =
    formData.objectName &&
    formData.controllingField &&
    formData.dependentField &&
    formData.mappings.length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <StyledFormContainer>
        <StyledSectionTitle>
          {rule ? t`Edit Dependent Field Rule` : t`Create Dependent Field Rule`}
        </StyledSectionTitle>

        <StyledFormRow>
          <StyledFormField>
            <StyledLabel htmlFor="objectName">{t`Object`}</StyledLabel>
            <StyledSelect
              id="objectName"
              value={selectedObject}
              onChange={(e) => setSelectedObject(e.target.value)}
              disabled={loading}
            >
              <option value="">{t`Select an object...`}</option>
              {objectMetadataItems.map((obj) => (
                <option key={obj.id} value={obj.nameSingular}>
                  {obj.labelSingular}
                </option>
              ))}
            </StyledSelect>
          </StyledFormField>

          <StyledFormField>
            <StyledLabel htmlFor="type">{t`Rule Type`}</StyledLabel>
            <StyledSelect
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'values' | 'visibility',
                })
              }
              disabled={loading}
            >
              <option value="values">{t`Filter Values`}</option>
              <option value="visibility">{t`Control Visibility`}</option>
            </StyledSelect>
          </StyledFormField>
        </StyledFormRow>

        <StyledFormRow>
          <StyledFormField>
            <StyledLabel htmlFor="controllingField">
              {t`Controlling Field`}
            </StyledLabel>
            <StyledSelect
              id="controllingField"
              value={formData.controllingField}
              onChange={(e) =>
                setFormData({ ...formData, controllingField: e.target.value })
              }
              disabled={loading || !selectedObject}
            >
              <option value="">{t`Select a field...`}</option>
              {availableFields.map((field) => (
                <option key={field.id} value={field.name}>
                  {field.label}
                </option>
              ))}
            </StyledSelect>
          </StyledFormField>

          <StyledFormField>
            <StyledLabel htmlFor="dependentField">
              {t`Dependent Field`}
            </StyledLabel>
            <StyledSelect
              id="dependentField"
              value={formData.dependentField}
              onChange={(e) =>
                setFormData({ ...formData, dependentField: e.target.value })
              }
              disabled={loading || !selectedObject}
            >
              <option value="">{t`Select a field...`}</option>
              {availableFields.map((field) => (
                <option key={field.id} value={field.name}>
                  {field.label}
                </option>
              ))}
            </StyledSelect>
          </StyledFormField>
        </StyledFormRow>

        <StyledFormField>
          <StyledLabel htmlFor="description">{t`Description`}</StyledLabel>
          <SettingsTextInput
            instanceId="description"
            placeholder={t`Optional description for this rule...`}
            value={formData.description || ''}
            onChange={(value) =>
              setFormData({ ...formData, description: value })
            }
            disabled={loading}
          />
        </StyledFormField>

        <StyledFormField>
          <StyledSectionTitle>{t`Field Mappings`}</StyledSectionTitle>
          <DependentFieldRuleMappingEditor
            mappings={formData.mappings}
            ruleType={formData.type}
            onChange={(mappings) => setFormData({ ...formData, mappings })}
          />
        </StyledFormField>

        <StyledButtonGroup>
          <Button
            Icon={IconX}
            title={t`Cancel`}
            size="small"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          />
          <Button
            Icon={IconCheck}
            title={rule ? t`Update Rule` : t`Create Rule`}
            size="small"
            variant="primary"
            type="submit"
            disabled={!isFormValid || loading}
          />
        </StyledButtonGroup>
      </StyledFormContainer>
    </form>
  );
};
