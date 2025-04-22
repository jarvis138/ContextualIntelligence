# Database Sharding Strategy

This document outlines the database sharding strategy for the Contextual Intelligence platform to improve scalability and performance.

## Sharding Approach

### Tenant-Based Sharding

We will implement tenant-based sharding to isolate data and improve performance for large enterprise customers.

#### Shard Key Selection

- Primary shard key: `tenant_id`
- Secondary shard key: `created_at` (for time-based partitioning within tenants)

#### Sharding Tiers

| Tier | Tenant Size | Sharding Strategy |
|------|-------------|-------------------|
| Small | < 10GB data | Shared database, separate schema |
| Medium | 10GB - 100GB data | Dedicated database instance |
| Large | > 100GB data | Dedicated database instance with read replicas |
| Enterprise | > 1TB data | Horizontal sharding with multiple database instances |

### Implementation Details

#### Connection Router

```typescript
// src/utils/db-router.ts
import { Pool } from 'pg';
import { getTenantConfig } from './tenant-config';

const shardPools = new Map<string, Pool>();

export async function getConnectionForTenant(tenantId: number): Promise<Pool> {
  // Check if connection pool exists for this tenant
  if (shardPools.has(`tenant-${tenantId}`)) {
    return shardPools.get(`tenant-${tenantId}`)!;
  }

  // Get tenant configuration
  const tenantConfig = await getTenantConfig(tenantId);
  
  // Create new connection pool
  const pool = new Pool({
    connectionString: tenantConfig.databaseUrl,
    max: tenantConfig.connectionPoolSize || 10,
    idleTimeoutMillis: 30000
  });
  
  // Store in cache
  shardPools.set(`tenant-${tenantId}`, pool);
  
  return pool;
}
```

#### Shard Management Service

```typescript
// src/services/shard-management.ts
import { db } from '../db';
import { logger } from '../utils/logger';

interface ShardInfo {
  shardId: string;
  databaseUrl: string;
  tenantIds: number[];
  currentLoad: number;
  maxCapacity: number;
}

export async function assignTenantToShard(tenantId: number): Promise<string> {
  // Get tenant size and requirements
  const tenantSize = await getTenantSize(tenantId);
  
  // Determine appropriate shard based on tenant size
  let targetShardId: string;
  
  if (tenantSize.isEnterprise) {
    // Create dedicated shards for enterprise tenants
    targetShardId = await createDedicatedShard(tenantId);
  } else {
    // Find suitable existing shard
    targetShardId = await findSuitableShard(tenantSize);
    
    // If no suitable shard found, create new one
    if (!targetShardId) {
      targetShardId = await createNewShard();
    }
  }
  
  // Update tenant-shard mapping
  await updateTenantShardMapping(tenantId, targetShardId);
  
  logger.info(`Assigned tenant ${tenantId} to shard ${targetShardId}`);
  
  return targetShardId;
}

export async function rebalanceShards(): Promise<void> {
  // Get current shard distribution
  const shards = await getAllShards();
  
  // Identify overloaded and underutilized shards
  const overloadedShards = shards.filter(s => s.currentLoad > 0.8 * s.maxCapacity);
  const underutilizedShards = shards.filter(s => s.currentLoad < 0.3 * s.maxCapacity);
  
  // Rebalance if needed
  if (overloadedShards.length > 0) {
    for (const shard of overloadedShards) {
      await redistributeTenants(shard, underutilizedShards);
    }
  }
  
  // Consider merging underutilized shards if too many
  if (underutilizedShards.length > 3) {
    await mergeUnderutilizedShards(underutilizedShards);
  }
}
```

## Migration Strategy

### Phase 1: Preparation

1. Implement shard management service
2. Create tenant-shard mapping table
3. Develop database migration tools

### Phase 2: Small Tenants

1. Group small tenants into shared databases
2. Migrate data in batches during off-peak hours
3. Update connection routing

### Phase 3: Medium and Large Tenants

1. Create dedicated database instances
2. Migrate tenant data with minimal downtime
3. Implement read replicas for large tenants

### Phase 4: Enterprise Tenants

1. Implement horizontal sharding for enterprise tenants
2. Develop custom query routing for sharded data
3. Set up cross-shard query capabilities

## Monitoring and Maintenance

### Shard Health Metrics

- Connection pool utilization
- Query performance by shard
- Storage utilization
- Replication lag (for replicas)

### Automated Maintenance

- Regular rebalancing jobs
- Automated backup strategy by shard
- Index optimization by usage patterns

## Fallback Strategy

In case of shard failure:

1. Detect shard unavailability through health checks
2. Redirect traffic to read replicas temporarily
3. Restore from backups if necessary
4. Implement automatic failover for critical tenants