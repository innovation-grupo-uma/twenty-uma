import { useState } from 'react';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { IconPlus, IconTrash } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';

import { DependentFieldMapping } from '../../shared/types';

const StyledMappingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledMappingRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: ${({ theme }) => theme.spacing(2)};
  align-items: start;
  padding: ${({ theme }) => theme.spacing(2)};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.border.radius.md};
`;

const StyledFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledLabel = styled.label`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledTagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(1)};
  margin-top: ${({ theme }) => theme.spacing(1)};
`;

const StyledTag = styled.span`
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.color.blue10};
  color: ${({ theme }) => theme.color.blue70};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: ${({ theme }) => theme.font.size.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledTagRemove = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: ${({ theme }) => theme.color.blue70};
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.color.red};
  }
`;

const StyledHelperText = styled.div`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-top: ${({ theme }) => theme.spacing(1)};
`;

export type DependentFieldRuleMappingEditorProps = {
  mappings: DependentFieldMapping[];
  ruleType: 'values' | 'visibility';
  onChange: (mappings: DependentFieldMapping[]) => void;
};

export const DependentFieldRuleMappingEditor = ({
  mappings,
  ruleType,
  onChange,
}: DependentFieldRuleMappingEditorProps) => {
  const { t } = useLingui();
  const [currentInputs, setCurrentInputs] = useState<{
    [key: number]: { controllingValue: string; dependentValue: string };
  }>({});

  const handleAddMapping = () => {
    const newMapping: DependentFieldMapping = {
      controllingValue: [],
      ...(ruleType === 'values'
        ? { dependentValues: [] }
        : { visible: true }),
    };
    onChange([...mappings, newMapping]);
  };

  const handleRemoveMapping = (index: number) => {
    onChange(mappings.filter((_, i) => i !== index));
  };

  const handleAddControllingValue = (index: number) => {
    const input = currentInputs[index]?.controllingValue?.trim();
    if (!input) return;

    const mapping = mappings[index];
    const currentValues = Array.isArray(mapping.controllingValue)
      ? mapping.controllingValue
      : [mapping.controllingValue];

    if (currentValues.includes(input)) return;

    const updatedMapping = {
      ...mapping,
      controllingValue: [...currentValues, input],
    };

    onChange(mappings.map((m, i) => (i === index ? updatedMapping : m)));
    setCurrentInputs({
      ...currentInputs,
      [index]: { ...currentInputs[index], controllingValue: '' },
    });
  };

  const handleRemoveControllingValue = (
    mappingIndex: number,
    valueIndex: number,
  ) => {
    const mapping = mappings[mappingIndex];
    const currentValues = Array.isArray(mapping.controllingValue)
      ? mapping.controllingValue
      : [mapping.controllingValue];

    const updatedValues = currentValues.filter((_, i) => i !== valueIndex);

    const updatedMapping = {
      ...mapping,
      controllingValue:
        updatedValues.length === 1 ? updatedValues[0] : updatedValues,
    };

    onChange(
      mappings.map((m, i) => (i === mappingIndex ? updatedMapping : m)),
    );
  };

  const handleAddDependentValue = (index: number) => {
    if (ruleType !== 'values') return;

    const input = currentInputs[index]?.dependentValue?.trim();
    if (!input) return;

    const mapping = mappings[index];
    const currentValues = mapping.dependentValues || [];

    if (currentValues.includes(input)) return;

    const updatedMapping = {
      ...mapping,
      dependentValues: [...currentValues, input],
    };

    onChange(mappings.map((m, i) => (i === index ? updatedMapping : m)));
    setCurrentInputs({
      ...currentInputs,
      [index]: { ...currentInputs[index], dependentValue: '' },
    });
  };

  const handleRemoveDependentValue = (
    mappingIndex: number,
    valueIndex: number,
  ) => {
    const mapping = mappings[mappingIndex];
    const currentValues = mapping.dependentValues || [];

    const updatedValues = currentValues.filter((_, i) => i !== valueIndex);

    const updatedMapping = {
      ...mapping,
      dependentValues: updatedValues,
    };

    onChange(
      mappings.map((m, i) => (i === mappingIndex ? updatedMapping : m)),
    );
  };

  const handleToggleVisibility = (index: number) => {
    if (ruleType !== 'visibility') return;

    const mapping = mappings[index];
    const updatedMapping = {
      ...mapping,
      visible: !mapping.visible,
    };

    onChange(mappings.map((m, i) => (i === index ? updatedMapping : m)));
  };

  return (
    <StyledMappingsContainer>
      {mappings.map((mapping, index) => {
        const controllingValues = Array.isArray(mapping.controllingValue)
          ? mapping.controllingValue
          : [mapping.controllingValue];

        return (
          <StyledMappingRow key={index}>
            <StyledFieldGroup>
              <StyledLabel>{t`Controlling Value(s)`}</StyledLabel>
              <SettingsTextInput
                instanceId={`controlling-value-${index}`}
                placeholder={t`Enter value and press Enter`}
                value={currentInputs[index]?.controllingValue || ''}
                onChange={(value) =>
                  setCurrentInputs({
                    ...currentInputs,
                    [index]: { ...currentInputs[index], controllingValue: value },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddControllingValue(index);
                  }
                }}
              />
              <StyledTagsContainer>
                {controllingValues
                  .filter((v) => v)
                  .map((value, valueIndex) => (
                    <StyledTag key={valueIndex}>
                      {value}
                      <StyledTagRemove
                        onClick={() =>
                          handleRemoveControllingValue(index, valueIndex)
                        }
                        type="button"
                      >
                        ×
                      </StyledTagRemove>
                    </StyledTag>
                  ))}
              </StyledTagsContainer>
              <StyledHelperText>
                {t`Press Enter to add multiple trigger values`}
              </StyledHelperText>
            </StyledFieldGroup>

            {ruleType === 'values' ? (
              <StyledFieldGroup>
                <StyledLabel>{t`Dependent Value(s)`}</StyledLabel>
                <SettingsTextInput
                  instanceId={`dependent-value-${index}`}
                  placeholder={t`Enter value and press Enter`}
                  value={currentInputs[index]?.dependentValue || ''}
                  onChange={(value) =>
                    setCurrentInputs({
                      ...currentInputs,
                      [index]: { ...currentInputs[index], dependentValue: value },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDependentValue(index);
                    }
                  }}
                />
                <StyledTagsContainer>
                  {(mapping.dependentValues || []).map((value, valueIndex) => (
                    <StyledTag key={valueIndex}>
                      {value}
                      <StyledTagRemove
                        onClick={() =>
                          handleRemoveDependentValue(index, valueIndex)
                        }
                        type="button"
                      >
                        ×
                      </StyledTagRemove>
                    </StyledTag>
                  ))}
                </StyledTagsContainer>
                <StyledHelperText>
                  {t`Available options when controlling field matches`}
                </StyledHelperText>
              </StyledFieldGroup>
            ) : (
              <StyledFieldGroup>
                <StyledLabel>{t`Visibility`}</StyledLabel>
                <Button
                  title={mapping.visible ? t`Visible` : t`Hidden`}
                  size="small"
                  variant={mapping.visible ? 'primary' : 'secondary'}
                  onClick={() => handleToggleVisibility(index)}
                />
                <StyledHelperText>
                  {mapping.visible
                    ? t`Field will be visible`
                    : t`Field will be hidden`}
                </StyledHelperText>
              </StyledFieldGroup>
            )}

            <div>
              <Button
                Icon={IconTrash}
                size="small"
                variant="tertiary"
                accent="danger"
                onClick={() => handleRemoveMapping(index)}
                ariaLabel={t`Remove mapping`}
              />
            </div>
          </StyledMappingRow>
        );
      })}

      <Button
        Icon={IconPlus}
        title={t`Add Mapping`}
        size="small"
        variant="secondary"
        onClick={handleAddMapping}
      />
    </StyledMappingsContainer>
  );
};
