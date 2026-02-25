# Ad-auction Module

API reference for the `@agora/sdk/ad-auction` module.

## Interfaces

### AdContent

| Property | Type | Description |
|----------|------|-------------|
| title | `string` |  |
| description | `string` |  |
| imageUrl? | `string` |  |
| targetUrl | `string` |  |
| campaignId? | `string` |  |

### BidRequest

| Property | Type | Description |
|----------|------|-------------|
| slotType | `AdSlotType` |  |
| maxBid | `bigint` |  |
| expiresAt | `number` |  |
| content | `AdContent` |  |
| chain | `SupportedChain` |  |

### Bid

| Property | Type | Description |
|----------|------|-------------|
| id | `string` |  |
| agentId | `string` |  |
| bidder | `Address` |  |
| amount | `bigint` |  |
| slotType | `AdSlotType` |  |
| placedAt | `number` |  |
| expiresAt | `number` |  |
| content | `AdContent` |  |
| status | `'pending' \| 'active' \| 'won' \| 'lost' \| 'expired'` |  |
| chain | `SupportedChain` |  |

### AuctionSlot

| Property | Type | Description |
|----------|------|-------------|
| type | `AdSlotType` |  |
| currentBid | `Bid \| null` |  |
| secondBid | `Bid \| null` |  |
| isAvailable | `boolean` |  |
| currentPrice | `bigint` |  |
| expiresIn | `number` |  |

### BudgetAllocation

| Property | Type | Description |
|----------|------|-------------|
| slotType | `AdSlotType` |  |
| dailyMax | `bigint` |  |
| currentSpend | `bigint` |  |
| maxBidPerSlot | `bigint` |  |

### AdBudget

| Property | Type | Description |
|----------|------|-------------|
| totalDailyBudget | `bigint` |  |
| currentDaySpend | `bigint` |  |
| allocations | `Map<AdSlotType, BudgetAllocation>` |  |
| dayStartTime | `number` |  |

### BidResult

| Property | Type | Description |
|----------|------|-------------|
| accepted | `boolean` |  |
| bidId? | `string` |  |
| Vickrey | `second bid + 1%) */` |  |
| actualPrice? | `bigint` |  |
| queuePosition? | `number` |  |
| rejectionReason? | `string` |  |
| estimatedWinPrice? | `bigint` |  |

### AuctionConfig

| Property | Type | Description |
|----------|------|-------------|
| minBidIncrement | `number` |  |
| bidDuration | `number` |  |
| decayRatePerHour | `number` |  |
| reserveMultiplier | `number` |  |
| maxBidsPerAgent | `number` |  |

## Classes

### AdAuctionManager

Ad Auction Module for Agora Implements real-time ad slot bidding with: - Vickrey auction (second-price) mechanism - Priority queue for pending bids - Automatic budget caps per agent - Time-decay pricing @module ad-auction

## Functions

### calculateVickreyPrice()

```typescript
calculateVickreyPrice(): bigint
```

### calculateDecayedPrice()

```typescript
calculateDecayedPrice(): bigint
```

### validateAdContent()

```typescript
validateAdContent(): void
```

### formatBidAmount()

```typescript
formatBidAmount(): string
```

### getRecommendedBid()

```typescript
getRecommendedBid(): bigint
```

### getOrCreateAdAuctionManager()

```typescript
getOrCreateAdAuctionManager(): AdAuctionManager
```

### getAdAuctionManager()

```typescript
getAdAuctionManager(): AdAuctionManager | undefined
```

### removeAdAuctionManager()

```typescript
removeAdAuctionManager(): boolean
```

### getAuctionStats()

```typescript
getAuctionStats(): void
```

### getAllActiveBids()

```typescript
getAllActiveBids(): Bid[]
```

### __resetAuctionStores()

```typescript
__resetAuctionStores(): void
```

