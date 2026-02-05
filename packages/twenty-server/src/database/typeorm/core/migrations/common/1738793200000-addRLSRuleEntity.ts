import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * RLS Rule Entity Migration
 * Agni CRM Extension - Row-Level Security
 * 
 * Creates the rlsRule table for storing row-level security rules
 */
export class AddRLSRuleEntity1738793200000 implements MigrationInterface {
  name = 'AddRLSRuleEntity1738793200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "core"."rlsRule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "objectMetadataId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "effect" text NOT NULL DEFAULT 'allow',
        "operations" text NOT NULL,
        "expression" jsonb NOT NULL,
        "priority" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "roleIds" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rls_rule" PRIMARY KEY ("id")
      )`,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_RLS_RULE_WORKSPACE_ID" ON "core"."rlsRule" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_RLS_RULE_OBJECT_METADATA_ID" ON "core"."rlsRule" ("objectMetadataId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_RLS_RULE_PRIORITY" ON "core"."rlsRule" ("priority")`,
    );

    // Add foreign keys
    await queryRunner.query(
      `ALTER TABLE "core"."rlsRule" ADD CONSTRAINT "FK_rls_rule_workspace" 
       FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") 
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."rlsRule" ADD CONSTRAINT "FK_rls_rule_object_metadata" 
       FOREIGN KEY ("objectMetadataId") REFERENCES "core"."objectMetadata"("id") 
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "core"."rlsRule" DROP CONSTRAINT "FK_rls_rule_object_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."rlsRule" DROP CONSTRAINT "FK_rls_rule_workspace"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "core"."IDX_RLS_RULE_PRIORITY"`);
    await queryRunner.query(
      `DROP INDEX "core"."IDX_RLS_RULE_OBJECT_METADATA_ID"`,
    );
    await queryRunner.query(`DROP INDEX "core"."IDX_RLS_RULE_WORKSPACE_ID"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "core"."rlsRule"`);
  }
}
