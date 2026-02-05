import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  RLSEffect,
  RLSOperation,
  RLSRuleExpression,
} from '../../../../../../../agni-extensions/row-level-security/shared/types';

/**
 * RLS Rule Entity
 * Agni CRM Extension - Row-Level Security
 * 
 * Stores security rules that control row-level access to objects
 * based on user roles and custom conditions.
 */
@Entity('rlsRule')
@Index('IDX_RLS_RULE_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_RLS_RULE_OBJECT_METADATA_ID', ['objectMetadataId'])
@Index('IDX_RLS_RULE_PRIORITY', ['priority'])
export class RLSRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  @Index()
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Column({ nullable: false, type: 'uuid' })
  @Index()
  objectMetadataId: string;

  @ManyToOne(() => ObjectMetadataEntity, (objectMetadata) => objectMetadata.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'objectMetadataId' })
  objectMetadata: Relation<ObjectMetadataEntity>;

  @Column({ nullable: false, type: 'varchar', length: 255 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({
    type: 'enum',
    enum: RLSEffect,
    nullable: false,
    default: RLSEffect.ALLOW,
  })
  effect: RLSEffect;

  @Column({
    type: 'simple-array',
    nullable: false,
  })
  operations: RLSOperation[];

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  expression: RLSRuleExpression;

  @Column({ type: 'int', nullable: false, default: 0 })
  priority: number;

  @Column({ type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({
    type: 'simple-array',
    nullable: false,
  })
  roleIds: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
