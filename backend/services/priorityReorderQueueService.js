/**
 * Priority Reorder Queue Service
 * Uses Min-Heap (Priority Queue) to rank products by urgency
 * Factors: days to stockout, demand velocity, supplier lead time
 */

class MinHeap {
  constructor() {
    this.heap = [];
  }

  // Get parent index
  parent(i) {
    return Math.floor((i - 1) / 2);
  }

  // Get left child index
  left(i) {
    return 2 * i + 1;
  }

  // Get right child index
  right(i) {
    return 2 * i + 2;
  }

  // Swap elements
  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Bubble up (heapify up)
  bubbleUp(i) {
    while (i > 0 && this.heap[this.parent(i)].priority > this.heap[i].priority) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  // Bubble down (heapify down)
  bubbleDown(i) {
    let smallest = i;
    const left = this.left(i);
    const right = this.right(i);

    if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
      smallest = left;
    }

    if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
      smallest = right;
    }

    if (smallest !== i) {
      this.swap(i, smallest);
      this.bubbleDown(smallest);
    }
  }

  // Insert element
  insert(element) {
    this.heap.push(element);
    this.bubbleUp(this.heap.length - 1);
  }

  // Extract minimum (highest priority)
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }

  // Peek at minimum without removing
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  // Get all elements sorted by priority
  getAll() {
    return [...this.heap].sort((a, b) => a.priority - b.priority);
  }

  // Get size
  size() {
    return this.heap.length;
  }

  // Check if empty
  isEmpty() {
    return this.heap.length === 0;
  }
}

class PriorityReorderQueueService {
  /**
   * Calculate urgency score for a product
   * Higher score = higher urgency (more critical)
   * 
   * Formula: urgencyScore = (daysToStockout * 40) + (demand * 30) + (leadTime * 30)
   * Weighted by importance
   */
  static calculateUrgencyScore(product, historicalDemand = []) {
    // 1. Calculate days to stockout
    let daysToStockout = Infinity;
    if (historicalDemand.length > 0) {
      // Calculate average daily demand
      const averageDailyDemand = historicalDemand.reduce((a, b) => a + b, 0) / historicalDemand.length;
      if (averageDailyDemand > 0) {
        daysToStockout = product.stock / averageDailyDemand;
      }
    } else if (product.salesVelocity > 0) {
      // Use product's recorded sales velocity (units per day)
      daysToStockout = product.stock / product.salesVelocity;
    } else {
      // Use default low stock threshold
      daysToStockout = (product.stock / (product.lowStockThreshold || 10)) * 7; // Estimate
    }

    // 2. Demand velocity (units per day)
    const demandVelocity = product.salesVelocity || (historicalDemand.length > 0 ? 
      historicalDemand.reduce((a, b) => a + b, 0) / 30 : 0); // Average daily demand

    // 3. Supplier lead time (days)
    const leadTime = product.supplier?.leadTime || 7;

    // 4. Current stock level (lower = more urgent)
    const stockLevel = product.stock || 0;
    const lowStockThreshold = product.lowStockThreshold || 10;
    const stockPercentage = Math.max(0, (stockLevel / lowStockThreshold) * 100);

    // 5. Calculate composite urgency score
    // Inverse days to stockout: fewer days = higher urgency
    const daysToStockoutScore = Math.max(0, 100 - daysToStockout);

    // Demand score: higher demand = more urgent
    const demandScore = Math.min(100, demandVelocity * 10);

    // Stock criticality: how close to zero
    const stockCriticalityScore = Math.max(0, 100 - stockPercentage);

    // Lead time factor: longer lead time = more urgent to reorder
    const leadTimeScore = Math.min(100, leadTime * 10);

    // Weighted composite
    const urgencyScore =
      (daysToStockoutScore * 0.35) +  // 35% weight on days to stockout
      (demandScore * 0.30) +           // 30% weight on demand
      (stockCriticalityScore * 0.20) + // 20% weight on stock criticality
      (leadTimeScore * 0.15);          // 15% weight on lead time

    return {
      score: Math.round(urgencyScore * 100) / 100,
      daysToStockout: Math.round(daysToStockout * 100) / 100,
      demandVelocity: Math.round(demandVelocity * 100) / 100,
      leadTime,
      stockPercentage: Math.round(stockPercentage * 100) / 100,
      recommendation: PriorityReorderQueueService.getRecommendation(urgencyScore, stockLevel, lowStockThreshold)
    };
  }

  /**
   * Get reorder recommendation based on urgency
   */
  static getRecommendation(urgencyScore, stock, lowStockThreshold) {
    if (urgencyScore >= 80) {
      return {
        priority: 'CRITICAL',
        action: 'IMMEDIATE_REORDER',
        reason: 'Stock critically low - risk of stockout'
      };
    } else if (urgencyScore >= 60) {
      return {
        priority: 'HIGH',
        action: 'URGENT_REORDER',
        reason: 'Stock approaching minimum level'
      };
    } else if (urgencyScore >= 40) {
      return {
        priority: 'MEDIUM',
        action: 'PLAN_REORDER',
        reason: 'Stock at moderate level - plan reorder'
      };
    } else if (urgencyScore >= 20) {
      return {
        priority: 'LOW',
        action: 'MONITOR',
        reason: 'Stock adequate - monitor for changes'
      };
    } else {
      return {
        priority: 'NONE',
        action: 'NO_ACTION',
        reason: 'Stock optimal - no action needed'
      };
    }
  }

  /**
   * Build priority queue from products
   */
  static buildPriorityQueue(products, historicalDemandMap = {}) {
    const pq = new MinHeap();

    products.forEach(product => {
      // Filter: only include products that need reordering
      if (product.stock > (product.lowStockThreshold * 2) || product.deletedAt) {
        return; // Skip - adequate stock
      }

      const historicalDemand = historicalDemandMap[product._id] || [];
      const urgencyMetrics = PriorityReorderQueueService.calculateUrgencyScore(product, historicalDemand);

      pq.insert({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        currentStock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        reorderQuantity: product.reorderQuantity || (product.lowStockThreshold * 3),
        priority: urgencyMetrics.score,
        urgencyMetrics,
        supplier: product.supplier,
        warehouse: product.warehouse
      });
    });

    return pq;
  }

  /**
   * Get top N urgent reorder items
   */
  static getTopUrgentItems(priorityQueue, limit = 20) {
    const items = [];
    const tempQueue = new MinHeap();

    // Copy all items from queue
    while (!priorityQueue.isEmpty()) {
      const item = priorityQueue.extractMin();
      items.push(item);
      tempQueue.insert(item);
    }

    // Restore original queue
    items.forEach(item => priorityQueue.insert(item));

    return items.slice(0, limit);
  }

  /**
   * Get paginated urgent reorder items
   */
  static getPaginatedUrgentItems(priorityQueue, page = 1, limit = 20) {
    const allItems = [];

    // Extract all items (temporarily)
    const tempQueue = new MinHeap();
    while (!priorityQueue.isEmpty()) {
      const item = priorityQueue.extractMin();
      allItems.push(item);
      tempQueue.insert(item);
    }

    // Restore original queue
    allItems.forEach(item => priorityQueue.insert(item));

    const total = allItems.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedItems = allItems.slice(start, start + limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }

  /**
   * Get reorder suggestions summary
   */
  static getSummary(priorityQueue) {
    const items = [];
    const tempQueue = new MinHeap();

    while (!priorityQueue.isEmpty()) {
      const item = priorityQueue.extractMin();
      items.push(item);
      tempQueue.insert(item);
    }

    // Restore
    items.forEach(item => priorityQueue.insert(item));

    const critical = items.filter(i => i.urgencyMetrics.recommendation.priority === 'CRITICAL');
    const high = items.filter(i => i.urgencyMetrics.recommendation.priority === 'HIGH');
    const medium = items.filter(i => i.urgencyMetrics.recommendation.priority === 'MEDIUM');

    return {
      totalItems: items.length,
      critical: {
        count: critical.length,
        totalReorderQuantity: critical.reduce((sum, i) => sum + i.reorderQuantity, 0),
        estimatedCost: critical.reduce((sum, i) => sum + (i.reorderQuantity * 50), 0) // Placeholder cost
      },
      high: {
        count: high.length,
        totalReorderQuantity: high.reduce((sum, i) => sum + i.reorderQuantity, 0),
        estimatedCost: high.reduce((sum, i) => sum + (i.reorderQuantity * 50), 0)
      },
      medium: {
        count: medium.length,
        totalReorderQuantity: medium.reduce((sum, i) => sum + i.reorderQuantity, 0),
        estimatedCost: medium.reduce((sum, i) => sum + (i.reorderQuantity * 50), 0)
      }
    };
  }
}

export { PriorityReorderQueueService, MinHeap };
