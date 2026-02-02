import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DependentFieldRuleEntity } from 'packages/twenty-server/src/engine/core-modules/dependent-field/dependent-field-rule.entity';
import { DependentFieldMetadataService } from './dependent-field-metadata.service';
import { DependentFieldEvaluatorService } from './dependent-field-evaluator.service';
import { DependentFieldResolver } from './dependent-field.resolver';

/**
 * Dependent Field Module
 *
 * Provides all services and resolvers for the Dependent Fields extension.
 * Import this module in the main application to enable dependent field functionality.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DependentFieldRuleEntity], 'core'),
  ],
  providers: [
    DependentFieldMetadataService,
    DependentFieldEvaluatorService,
    DependentFieldResolver,
  ],
  exports: [
    DependentFieldMetadataService,
    DependentFieldEvaluatorService,
  ],
})
export class DependentFieldModule {}
