import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from 'class-validator';

@InputType()
export class GetDependentFieldRulesInput {
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

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;
}

@InputType()
export class GetDependentFieldRuleInput {
  @Field()
  @IsUUID()
  id: string;
}

@InputType()
export class DeleteDependentFieldRuleInput {
  @Field()
  @IsUUID()
  id: string;
}
