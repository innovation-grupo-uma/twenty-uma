import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RLSRuleEntity } from './rls-rule.entity';
import { RLSRuleService } from '../../../../../agni-extensions/row-level-security/backend/rls-rule.service';
import { RLSEngineService } from '../../../../../agni-extensions/row-level-security/backend/rls-engine.service';
import { RLSRulesCacheService } from '../../../../../agni-extensions/row-level-security/backend/rls-cache.service';
import { RLSRuleResolver } from '../../../../../agni-extensions/row-level-security/backend/rls-rule.resolver';
import { WorkspaceCacheModule } from '../../workspace-cache/workspace-cache.module';

/**
 * RLS Rule Module
 * Agni CRM Extension - Row-Level Security
 * 
 * Provides RLS rule storage, caching, evaluation, and GraphQL API
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([RLSRuleEntity]),
    WorkspaceCacheModule,
  ],
  providers: [
    RLSRuleService,
    RLSEngineService,
    RLSRulesCacheService,
    RLSRuleResolver,
  ],
  exports: [RLSRuleService, RLSEngineService, RLSRulesCacheService],
})
export class RLSRuleModule {}
