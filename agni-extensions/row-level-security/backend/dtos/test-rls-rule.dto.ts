import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsObject, IsUUID } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';

@InputType()
export class TestRLSRuleInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  ruleId: string;

  @Field(() => GraphQLJSONObject)
  @IsObject()
  testContext: any;
}

@ObjectType()
export class RLSTestResult {
  @Field()
  ruleId: string;

  @Field()
  passed: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => GraphQLJSONObject)
  evaluationDetails: any;
}
