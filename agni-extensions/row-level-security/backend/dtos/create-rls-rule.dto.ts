import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';

import { RLSEffect, RLSOperation } from '../../shared/types';

@InputType()
export class CreateRLSRuleInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  objectMetadataId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String)
  @IsEnum(RLSEffect)
  effect: RLSEffect;

  @Field(() => [String])
  @IsArray()
  @IsEnum(RLSOperation, { each: true })
  operations: RLSOperation[];

  @Field(() => GraphQLJSONObject)
  @IsObject()
  expression: any;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  priority: number;

  @Field(() => [String])
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
