import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RLSRuleEntity } from './rls-rule.entity';
import { RLSRuleService } from '../../../../../agni-extensions/row-level-security/backend/rls-rule.service';

/**
 * RLS Rule Module
 * Agni CRM Extension - Row-Level Security
 * 
 * Provides RLS rule storage and management functionality
 */
@Module({
  imports: [TypeOrmModule.forFeature([RLSRuleEntity])],
  providers: [RLSRuleService],
  exports: [RLSRuleService],
})
export class RLSRuleModule {}
