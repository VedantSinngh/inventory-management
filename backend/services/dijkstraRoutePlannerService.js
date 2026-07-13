/**
 * Dijkstra's Algorithm - Optimal Route Planner Service
 * Finds shortest/cheapest delivery path between suppliers, warehouses, and destinations
 */

class DijkstraRoutePlanner {
  /**
   * Build a graph of nodes and edges with distances and costs
   * @param {Array} nodes - Warehouses and suppliers with location data
   * @param {Array} edges - Routes with costs and distances
   */
  constructor(nodes = [], edges = []) {
    this.nodes = new Map();
    this.edges = new Map();
    this.buildGraph(nodes, edges);
  }

  /**
   * Build graph from nodes and edges
   */
  buildGraph(nodes, edges) {
    // Initialize nodes
    nodes.forEach(node => {
      this.nodes.set(node.id, {
        id: node.id,
        name: node.name,
        type: node.type, // 'WAREHOUSE' or 'SUPPLIER'
        latitude: node.latitude,
        longitude: node.longitude,
        address: node.address
      });
      this.edges.set(node.id, []);
    });

    // Add edges (bidirectional)
    edges.forEach(edge => {
      const edgeData = {
        from: edge.from,
        to: edge.to,
        distance: edge.distance, // km
        cost: edge.cost, // currency units
        time: edge.time, // minutes
        carrier: edge.carrier || 'STANDARD'
      };

      // Add forward edge
      if (this.edges.has(edge.from)) {
        this.edges.get(edge.from).push(edgeData);
      } else {
        this.edges.set(edge.from, [edgeData]);
      }

      // Add reverse edge (for bidirectional routing)
      const reverseEdge = { ...edgeData, from: edge.to, to: edge.from };
      if (this.edges.has(edge.to)) {
        this.edges.get(edge.to).push(reverseEdge);
      } else {
        this.edges.set(edge.to, [reverseEdge]);
      }
    });
  }

  /**
   * Dijkstra's Algorithm - Find shortest path
   * @param {String} startId - Starting node ID
   * @param {String} endId - Destination node ID
   * @param {String} criterion - 'COST', 'DISTANCE', or 'TIME'
   * @returns {Object} - Path, total distance/cost/time, and steps
   */
  findOptimalPath(startId, endId, criterion = 'COST') {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      throw new Error('Invalid start or end node');
    }

    const distances = new Map();
    const costs = new Map();
    const times = new Map();
    const previous = new Map();
    const unvisited = new Set();

    // Initialize distances and costs
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      costs.set(nodeId, Infinity);
      times.set(nodeId, Infinity);
      unvisited.add(nodeId);
    }

    // Start node has 0 distance/cost/time
    distances.set(startId, 0);
    costs.set(startId, 0);
    times.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum value
      let currentId = null;
      let minValue = Infinity;

      for (const nodeId of unvisited) {
        let value;
        switch (criterion) {
          case 'DISTANCE':
            value = distances.get(nodeId);
            break;
          case 'TIME':
            value = times.get(nodeId);
            break;
          case 'COST':
          default:
            value = costs.get(nodeId);
        }

        if (value < minValue) {
          minValue = value;
          currentId = nodeId;
        }
      }

      if (currentId === null || minValue === Infinity) break;

      unvisited.delete(currentId);

      // Check neighbors
      const neighbors = this.edges.get(currentId) || [];
      for (const edge of neighbors) {
        const neighbor = edge.to;
        if (!unvisited.has(neighbor)) continue;

        const newDistance = distances.get(currentId) + edge.distance;
        const newCost = costs.get(currentId) + edge.cost;
        const newTime = times.get(currentId) + edge.time;

        // Update if we found a shorter path
        let shouldUpdate = false;
        switch (criterion) {
          case 'DISTANCE':
            shouldUpdate = newDistance < distances.get(neighbor);
            break;
          case 'TIME':
            shouldUpdate = newTime < times.get(neighbor);
            break;
          case 'COST':
          default:
            shouldUpdate = newCost < costs.get(neighbor);
        }

        if (shouldUpdate) {
          distances.set(neighbor, newDistance);
          costs.set(neighbor, newCost);
          times.set(neighbor, newTime);
          previous.set(neighbor, { id: currentId, edge });
        }
      }
    }

    // Reconstruct path
    const path = [];
    let current = endId;
    while (previous.has(current)) {
      const prev = previous.get(current);
      path.unshift({
        from: prev.id,
        to: current,
        distance: prev.edge.distance,
        cost: prev.edge.cost,
        time: prev.edge.time,
        carrier: prev.edge.carrier
      });
      current = prev.id;
    }

    if (path.length === 0 && startId !== endId) {
      throw new Error('No route found between nodes');
    }

    const stopsSequence = path.map(segment => {
      const node = this.nodes.get(segment.to);
      return {
        nodeId: segment.to,
        name: node?.name || 'Destination',
        type: node?.type || 'DESTINATION'
      };
    });

    return {
      startNode: this.nodes.get(startId),
      endNode: this.nodes.get(endId),
      stopsSequence,
      path,
      totalDistance: distances.get(endId),
      totalCost: costs.get(endId),
      totalTime: times.get(endId),
      steps: path.length,
      criterion,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate Haversine distance between two coordinates
   * @param {Number} lat1, lon1, lat2, lon2
   * @returns {Number} - Distance in kilometers
   */
  static calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Build graph automatically from warehouse/supplier locations
   * @param {Array} locations - Array of {id, name, type, latitude, longitude}
   * @param {Number} costPerKm - Cost per kilometer for shipping
   * @param {Number} avgSpeedKmPerHour - Average speed for time calculation
   */
  static buildGraphFromLocations(locations, costPerKm = 5, avgSpeedKmPerHour = 60) {
    const nodes = locations;
    const edges = [];

    // Create edges between all location pairs
    for (let i = 0; i < locations.length; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const loc1 = locations[i];
        const loc2 = locations[j];

        const distance = DijkstraRoutePlanner.calculateHaversineDistance(
          loc1.latitude,
          loc1.longitude,
          loc2.latitude,
          loc2.longitude
        );

        const cost = distance * costPerKm;
        const time = (distance / avgSpeedKmPerHour) * 60; // minutes

        edges.push({
          from: loc1.id,
          to: loc2.id,
          distance,
          cost,
          time
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Find all shortest paths (for comparison)
   */
  findAllPaths(startId, endId, criterion = 'COST') {
    // Simple implementation - can be enhanced
    const result = this.findOptimalPath(startId, endId, criterion);
    return [result];
  }
}

export default DijkstraRoutePlanner;
