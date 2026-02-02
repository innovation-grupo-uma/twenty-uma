import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsEnum, IsArray, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class DependentFieldMappingInput {
  @Field(() => [String])
  @IsArray()
  controllingValue: string[];

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  dependentValues?: string[];

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}

@InputType()
export class CreateDependentFieldRuleInput {
  @Field()
  @IsString()
  objectName: string;

  @Field()
  @IsString()
  controllingField: string;

  @Field()
  @IsString()
  dependentField: string;

  @Field()
  @IsEnum(['values', 'visibility'])
  type: 'values' | 'visibility';

  @Field(() => [DependentFieldMappingInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependentFieldMappingInput)
  mappings: DependentFieldMappingInput[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true, defaultValue: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
