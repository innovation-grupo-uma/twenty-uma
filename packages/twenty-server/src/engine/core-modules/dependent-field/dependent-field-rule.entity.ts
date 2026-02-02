import { Field, ObjectType } from '@nestjs/graphql';

import { IDField } from '@ptc-org/nestjs-query-graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

/**
 * Dependent Field Rule Entity
 *
 * Stores configurations for dependent picklists and conditional field visibility.
 * Each rule defines how a dependent field should behave based on a controlling field's value.
 */
@Index('IDX_DEPENDENT_FIELD_RULE_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_DEPENDENT_FIELD_RULE_OBJECT_NAME', ['objectName'])
@Index('IDX_DEPENDENT_FIELD_RULE_CONTROLLING_FIELD', ['controllingField'])
@Index('IDX_DEPENDENT_FIELD_RULE_DEPENDENT_FIELD', ['dependentField'])
@Entity({ name: 'dependentFieldRule', schema: 'core' })
@ObjectType('DependentFieldRule')
export class DependentFieldRuleEntity extends WorkspaceRelatedEntity {
  @IDField(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  objectName: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  controllingField: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  dependentField: string;

  @Field()
  @Column({ type: 'varchar', length: 50 })
  type: 'values' | 'visibility';

  @Field(() => String)
  @Column({ type: 'jsonb' })
  mappings: string; // JSON stringified DependentFieldMapping[]

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
