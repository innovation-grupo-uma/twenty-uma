import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddDependentFieldRuleTable1738454400000
  implements MigrationInterface
{
  name = 'AddDependentFieldRuleTable1738454400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for rule type
    await queryRunner.query(
      `CREATE TYPE "core"."dependentFieldRule_type_enum" AS ENUM('values', 'visibility')`,
    );

    // Create the dependent field rule table
    await queryRunner.query(
      `CREATE TABLE "core"."dependentFieldRule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "objectName" character varying(255) NOT NULL,
        "controllingField" character varying(255) NOT NULL,
        "dependentField" character varying(255) NOT NULL,
        "type" "core"."dependentFieldRule_type_enum" NOT NULL,
        "mappings" jsonb NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dependentFieldRule" PRIMARY KEY ("id")
      )`,
    );

    // Create indexes for common query patterns
    await queryRunner.query(
      `CREATE INDEX "IDX_DEPENDENT_FIELD_RULE_WORKSPACE_ID" ON "core"."dependentFieldRule" ("workspaceId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_DEPENDENT_FIELD_RULE_OBJECT_NAME" ON "core"."dependentFieldRule" ("objectName")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_DEPENDENT_FIELD_RULE_CONTROLLING_FIELD" ON "core"."dependentFieldRule" ("controllingField")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_DEPENDENT_FIELD_RULE_DEPENDENT_FIELD" ON "core"."dependentFieldRule" ("dependentField")`,
    );

    // Create composite index for the most common lookup pattern
    await queryRunner.query(
      `CREATE INDEX "IDX_DEPENDENT_FIELD_RULE_WORKSPACE_OBJECT_DEPENDENT" ON "core"."dependentFieldRule" ("workspaceId", "objectName", "dependentField")`,
    );

    // Add foreign key constraint to workspace table
    await queryRunner.query(
      `ALTER TABLE "core"."dependentFieldRule" ADD CONSTRAINT "FK_dependentFieldRule_workspace" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "core"."dependentFieldRule" DROP CONSTRAINT "FK_dependentFieldRule_workspace"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "core"."IDX_DEPENDENT_FIELD_RULE_WORKSPACE_OBJECT_DEPENDENT"`,
    );

    await queryRunner.query(
      `DROP INDEX "core"."IDX_DEPENDENT_FIELD_RULE_DEPENDENT_FIELD"`,
    );

    await queryRunner.query(
      `DROP INDEX "core"."IDX_DEPENDENT_FIELD_RULE_CONTROLLING_FIELD"`,
    );

    await queryRunner.query(
      `DROP INDEX "core"."IDX_DEPENDENT_FIELD_RULE_OBJECT_NAME"`,
    );

    await queryRunner.query(
      `DROP INDEX "core"."IDX_DEPENDENT_FIELD_RULE_WORKSPACE_ID"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "core"."dependentFieldRule"`);

    // Drop enum
    await queryRunner.query(
      `DROP TYPE "core"."dependentFieldRule_type_enum"`,
    );
  }
}
