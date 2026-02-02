import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsEnum, IsArray, IsOptional, IsBoolean, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { DependentFieldMappingInput } from './create-dependent-field-rule.dto';

@InputType()
export class UpdateDependentFieldRuleInput {
  @Field()
  @IsUUID()
  id: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  objectName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  controllingField?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  dependentField?: string;

  @Field({ nullable: true })
  @IsEnum(['values', 'visibility'])
  @IsOptional()
  type?: 'values' | 'visibility';

  @Field(() => [DependentFieldMappingInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependentFieldMappingInput)
  @IsOptional()
  mappings?: DependentFieldMappingInput[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
