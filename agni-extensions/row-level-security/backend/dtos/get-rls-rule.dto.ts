import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class GetRLSRuleInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}

@InputType()
export class GetRLSRulesByObjectInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  objectMetadataId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

@InputType()
export class DeleteRLSRuleInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
