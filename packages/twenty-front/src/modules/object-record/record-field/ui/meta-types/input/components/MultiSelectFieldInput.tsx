import { FieldInputEventContext } from '@/object-record/record-field/ui/contexts/FieldInputEventContext';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useAddSelectOption } from '@/object-record/record-field/ui/meta-types/hooks/useAddSelectOption';
import { useCanAddSelectOption } from '@/object-record/record-field/ui/meta-types/hooks/useCanAddSelectOption';
import { useMultiSelectField } from '@/object-record/record-field/ui/meta-types/hooks/useMultiSelectField';
import { SELECT_FIELD_INPUT_SELECTABLE_LIST_COMPONENT_INSTANCE_ID } from '@/object-record/record-field/ui/meta-types/input/constants/SelectFieldInputSelectableListComponentInstanceId';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { type FieldMultiSelectValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { MultiSelectInput } from '@/ui/field/input/components/MultiSelectInput';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useContext } from 'react';
import { useSelectFieldWithDependentRules } from 'agni-extensions/dependent-fields/frontend/hooks/useSelectFieldWithDependentRules';

export const MultiSelectFieldInput = () => {
  const { fieldDefinition, draftValue, setDraftValue } = useMultiSelectField();
  const { addSelectOption } = useAddSelectOption(
    fieldDefinition?.metadata?.fieldName,
  );
  const { canAddSelectOption } = useCanAddSelectOption(
    fieldDefinition?.metadata?.fieldName,
  );

  const { onSubmit } = useContext(FieldInputEventContext);
  const fieldContext = useContext(FieldContext);

  const instanceId = useAvailableComponentInstanceIdOrThrow(
    RecordFieldComponentInstanceContext,
  );

  // Get record data to access controlling field values
  const { record } = useFindOneRecord({
    objectNameSingular: fieldContext?.fieldDefinition?.metadata?.objectMetadataItem?.nameSingular || '',
    objectRecordId: fieldContext?.recordId,
    skip: !fieldContext?.recordId,
  });

  // Apply dependent field rules to filter options
  const dependentFieldResult = useSelectFieldWithDependentRules(
    fieldContext?.fieldDefinition?.metadata?.objectMetadataItem?.nameSingular || '',
    fieldDefinition?.metadata?.fieldName || '',
    fieldDefinition.metadata.options,
    record,
  );

  // Use dependent-filtered options if rules apply, otherwise use all options
  const effectiveOptions = dependentFieldResult.hasDependentRules
    ? dependentFieldResult.options
    : fieldDefinition.metadata.options;

  const handleOptionSelected = (newDraftValue: FieldMultiSelectValue) => {
    setDraftValue(newDraftValue);
  };

  const handleCancel = () => {
    onSubmit?.({ newValue: draftValue });
  };

  const handleAddSelectOption = (optionName: string) => {
    if (!canAddSelectOption) {
      return;
    }
    addSelectOption(optionName);
  };

  // Hide field if dependent field rules say it should be hidden
  if (dependentFieldResult.hasDependentRules && !dependentFieldResult.isVisible) {
    return null;
  }

  return (
    <MultiSelectInput
      selectableListComponentInstanceId={
        SELECT_FIELD_INPUT_SELECTABLE_LIST_COMPONENT_INSTANCE_ID
      }
      focusId={instanceId}
      options={effectiveOptions}
      onCancel={handleCancel}
      onOptionSelected={handleOptionSelected}
      values={draftValue}
      onAddSelectOption={handleAddSelectOption}
    />
  );
};
