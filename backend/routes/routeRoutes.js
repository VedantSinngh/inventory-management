import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import DijkstraRoutePlanner from '../services/dijkstraRoutePlannerService.js';
import Route from '../models/Route.js';
import Warehouse from '../models/Warehouse.js';
import Supplier from '../models/Supplier.js';
import Shipment from '../models/Shipment.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * POST /api/routes/optimal
 * Find optimal route between two nodes using Dijkstra's algorithm
 */
router.post('/optimal', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { fromNodeId, toNodeId, criterion = 'COST' } = req.body;

    if (!fromNodeId || !toNodeId) {
      return res.status(400).json({
        message: 'fromNodeId and toNodeId are required',
        status: 400
      });
    }

    // Fetch all routes from database
    const allRoutes = await Route.find({ active: true, deletedAt: null });

    // Fetch all warehouses and suppliers as nodes
    const warehouses = await Warehouse.find({ deletedAt: null }).lean();
    const suppliers = await Supplier.find({ deletedAt: null }).lean();

    const nodes = [
      ...warehouses.map(w => ({
        id: w._id.toString(),
        name: w.name,
        type: 'WAREHOUSE',
        latitude: w.address?.latitude,
        longitude: w.address?.longitude,
        address: w.location
      })),
      ...suppliers.map(s => ({
        id: s._id.toString(),
        name: s.name,
        type: 'SUPPLIER',
        latitude: s.contactInfo?.address?.latitude,
        longitude: s.contactInfo?.address?.longitude,
        address: s.contactInfo?.address?.city
      }))
    ];

    // Build edges from stored routes
    const edges = allRoutes.map(r => ({
      from: r.fromNode.nodeId.toString(),
      to: r.toNode.nodeId.toString(),
      distance: r.distance,
      cost: r.cost,
      time: r.estimatedTime,
      carrier: r.carriers?.[0] || 'STANDARD'
    }));

    // If no stored routes, auto-generate from coordinates
    if (edges.length === 0) {
      const { nodes: autoNodes, edges: autoEdges } = DijkstraRoutePlanner.buildGraphFromLocations(
        nodes.filter(n => n.latitude && n.longitude),
        5, // $5 per km
        60 // 60 km/h average speed
      );
      edges.push(...autoEdges);
    }

    // Create and run Dijkstra's algorithm
    const planner = new DijkstraRoutePlanner(nodes, edges);
    const optimalPath = planner.findOptimalPath(fromNodeId, toNodeId, criterion);

    // Log the route finding
    logger.info('Optimal route found', {
      from: fromNodeId,
      to: toNodeId,
      criterion,
      totalCost: optimalPath.totalCost,
      totalDistance: optimalPath.totalDistance,
      totalTime: optimalPath.totalTime,
      userId: req.user.id
    });

    res.json({
      data: optimalPath,
      pagination: null
    });
  } catch (error) {
    logger.error('Route optimization error', { error: error.message });
    res.status(500).json({
      message: 'Error finding optimal route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/routes/manual
 * Manually add or update a route
 */
router.post('/manual', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const {
      name,
      fromNodeId,
      toNodeId,
      fromNodeType,
      toNodeType,
      distance,
      estimatedTime,
      cost,
      carriers,
      maxWeight,
      maxVolume,
      notes
    } = req.body;

    // Validate inputs
    if (!name || !fromNodeId || !toNodeId || !distance || !estimatedTime || !cost) {
      return res.status(400).json({
        message: 'Missing required fields',
        status: 400
      });
    }

    // Fetch node details
    let fromNode, toNode;

    if (fromNodeType === 'WAREHOUSE') {
      fromNode = await Warehouse.findById(fromNodeId).lean();
    } else {
      fromNode = await Supplier.findById(fromNodeId).lean();
    }

    if (toNodeType === 'WAREHOUSE') {
      toNode = await Warehouse.findById(toNodeId).lean();
    } else {
      toNode = await Supplier.findById(toNodeId).lean();
    }

    if (!fromNode || !toNode) {
      return res.status(404).json({
        message: 'From or To node not found',
        status: 404
      });
    }

    const route = new Route({
      name,
      fromNode: {
        type: fromNodeType,
        nodeId: fromNodeId,
        name: fromNode.name,
        latitude: fromNode.address?.latitude || fromNode.contactInfo?.address?.latitude,
        longitude: fromNode.address?.longitude || fromNode.contactInfo?.address?.longitude,
        address: fromNode.location || fromNode.contactInfo?.address?.city
      },
      toNode: {
        type: toNodeType,
        nodeId: toNodeId,
        name: toNode.name,
        latitude: toNode.address?.latitude || toNode.contactInfo?.address?.latitude,
        longitude: toNode.address?.longitude || toNode.contactInfo?.address?.longitude,
        address: toNode.location || toNode.contactInfo?.address?.city
      },
      distance,
      estimatedTime,
      cost,
      carriers: carriers || [],
      maxWeight,
      maxVolume,
      notes,
      createdBy: req.user.id
    });

    await route.save();

    logger.info('Route created', {
      routeId: route._id,
      from: fromNode.name,
      to: toNode.name,
      userId: req.user.id
    });

    res.status(201).json({
      data: route,
      pagination: null
    });
  } catch (error) {
    logger.error('Route creation error', { error: error.message });
    res.status(500).json({
      message: 'Error creating route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/routes
 * Get all routes
 */
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;

    const query = { deletedAt: null };
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const routes = await Route.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Route.countDocuments(query);

    res.json({
      data: routes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Routes fetch error', { error: error.message });
    res.status(500).json({
      message: 'Error fetching routes',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/routes/:id
 * Get route details
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).lean();

    if (!route || route.deletedAt) {
      return res.status(404).json({
        message: 'Route not found',
        status: 404
      });
    }

    res.json({
      data: route,
      pagination: null
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * PUT /api/routes/:id
 * Update route
 */
router.put('/:id', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const { distance, estimatedTime, cost, carriers, active, notes } = req.body;

    const route = await Route.findById(req.params.id);
    if (!route || route.deletedAt) {
      return res.status(404).json({
        message: 'Route not found',
        status: 404
      });
    }

    if (distance !== undefined) route.distance = distance;
    if (estimatedTime !== undefined) route.estimatedTime = estimatedTime;
    if (cost !== undefined) route.cost = cost;
    if (carriers !== undefined) route.carriers = carriers;
    if (active !== undefined) route.active = active;
    if (notes !== undefined) route.notes = notes;

    await route.save();

    logger.info('Route updated', {
      routeId: route._id,
      userId: req.user.id
    });

    res.json({
      data: route,
      pagination: null
    });
  } catch (error) {
    logger.error('Route update error', { error: error.message });
    res.status(500).json({
      message: 'Error updating route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * DELETE /api/routes/:id
 * Soft delete route
 */
router.delete('/:id', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route || route.deletedAt) {
      return res.status(404).json({
        message: 'Route not found',
        status: 404
      });
    }

    route.deletedAt = new Date();
    await route.save();

    logger.info('Route deleted', {
      routeId: route._id,
      userId: req.user.id
    });

    res.json({
      message: 'Route deleted successfully',
      data: route
    });
  } catch (error) {
    logger.error('Route deletion error', { error: error.message });
    res.status(500).json({
      message: 'Error deleting route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/routes/shipment/:shipmentId/optimize
 * Optimize a specific shipment's route
 */
router.post('/shipment/:shipmentId/optimize', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) {
      return res.status(404).json({
        message: 'Shipment not found',
        status: 404
      });
    }

    // Get origin (warehouse) and destination
    const warehouse = await Warehouse.findById(shipment.originAddress).lean();
    if (!warehouse) {
      return res.status(404).json({
        message: 'Origin warehouse not found',
        status: 404
      });
    }

    const criterion = req.body.criterion || 'COST';
    const allRoutes = await Route.find({ active: true, deletedAt: null });

    // Build graph and find optimal path
    const nodes = [
      {
        id: warehouse._id.toString(),
        name: warehouse.name,
        type: 'WAREHOUSE',
        latitude: warehouse.address?.latitude,
        longitude: warehouse.address?.longitude
      },
      {
        id: 'destination',
        name: 'Destination',
        type: 'DESTINATION',
        latitude: shipment.destinationAddress.latitude,
        longitude: shipment.destinationAddress.longitude
      }
    ];

    const edges = allRoutes.map(r => ({
      from: r.fromNode.nodeId.toString(),
      to: r.toNode.nodeId.toString(),
      distance: r.distance,
      cost: r.cost,
      time: r.estimatedTime
    }));

    if (edges.length === 0) {
      const { nodes: autoNodes, edges: autoEdges } = DijkstraRoutePlanner.buildGraphFromLocations(nodes, 5, 60);
      edges.push(...autoEdges);
    }

    const planner = new DijkstraRoutePlanner(nodes, edges);
    const optimalPath = planner.findOptimalPath(warehouse._id.toString(), 'destination', criterion);

    logger.info('Shipment route optimized', {
      shipmentId: req.params.shipmentId,
      criterion,
      userId: req.user.id
    });

    res.json({
      data: optimalPath,
      pagination: null
    });
  } catch (error) {
    logger.error('Shipment route optimization error', { error: error.message });
    res.status(500).json({
      message: 'Error optimizing shipment route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/routes/multi-stop
 * Calculate multi-stop optimal delivery route using Dijkstra as the edge evaluator
 */
router.post('/multi-stop', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { startNodeId, stopNodeIds, criterion = 'COST' } = req.body;

    if (!startNodeId || !stopNodeIds || !Array.isArray(stopNodeIds) || stopNodeIds.length === 0) {
      return res.status(400).json({
        message: 'startNodeId and an array of stopNodeIds are required',
        status: 400
      });
    }

    const allRoutes = await Route.find({ active: true, deletedAt: null });
    const warehouses = await Warehouse.find({ deletedAt: null }).lean();
    const suppliers = await Supplier.find({ deletedAt: null }).lean();

    const nodes = [
      ...warehouses.map(w => ({
        id: w._id.toString(),
        name: w.name,
        type: 'WAREHOUSE',
        latitude: w.address?.latitude,
        longitude: w.address?.longitude,
        address: w.location
      })),
      ...suppliers.map(s => ({
        id: s._id.toString(),
        name: s.name,
        type: 'SUPPLIER',
        latitude: s.contactInfo?.address?.latitude,
        longitude: s.contactInfo?.address?.longitude,
        address: s.contactInfo?.address?.city
      }))
    ];

    const edges = allRoutes.map(r => ({
      from: r.fromNode.nodeId.toString(),
      to: r.toNode.nodeId.toString(),
      distance: r.distance,
      cost: r.cost,
      time: r.estimatedTime,
      carrier: r.carriers?.[0] || 'STANDARD'
    }));

    if (edges.length === 0) {
      const { edges: autoEdges } = DijkstraRoutePlanner.buildGraphFromLocations(
        nodes.filter(n => n.latitude && n.longitude),
        5,
        60
      );
      edges.push(...autoEdges);
    }

    const planner = new DijkstraRoutePlanner(nodes, edges);

    let currentId = startNodeId;
    let remainingStops = [...stopNodeIds];
    let fullPath = [];
    let totalDistance = 0;
    let totalCost = 0;
    let totalTime = 0;
    const pathStops = [];

    while (remainingStops.length > 0) {
      let nearestStop = null;
      let bestPathResult = null;
      let minVal = Infinity;

      for (const stopId of remainingStops) {
        try {
          const result = planner.findOptimalPath(currentId, stopId, criterion);
          let val;
          if (criterion === 'DISTANCE') val = result.totalDistance;
          else if (criterion === 'TIME') val = result.totalTime;
          else val = result.totalCost;

          if (val < minVal) {
            minVal = val;
            nearestStop = stopId;
            bestPathResult = result;
          }
        } catch (e) {
          // No path found
        }
      }

      if (!nearestStop) {
        break; // unreachable stops
      }

      fullPath = fullPath.concat(bestPathResult.path);
      totalDistance += bestPathResult.totalDistance;
      totalCost += bestPathResult.totalCost;
      totalTime += bestPathResult.totalTime;
      pathStops.push({
        nodeId: nearestStop,
        name: bestPathResult.endNode.name,
        type: bestPathResult.endNode.type
      });

      remainingStops = remainingStops.filter(id => id !== nearestStop);
      currentId = nearestStop;
    }

    res.json({
      data: {
        startNode: planner.nodes.get(startNodeId),
        stopsSequence: pathStops,
        path: fullPath,
        totalDistance,
        totalCost,
        totalTime,
        criterion
      }
    });
  } catch (error) {
    logger.error('Multi-stop route optimization error', { error: error.message });
    res.status(500).json({
      message: 'Error optimizing multi-stop route',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/routes/reroute
 * Dynamically re-route shipment if a warehouse is out of stock
 */
router.post('/reroute', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { shipmentId, outOfStockWarehouseId, productId } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found', status: 404 });
    }

    // Find warehouses with stock > 0
    const Product = (await import('../models/Product.js')).default;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found', status: 404 });
    }

    const warehouses = await Warehouse.find({
      _id: { $ne: outOfStockWarehouseId },
      deletedAt: null
    }).lean();

    const allRoutes = await Route.find({ active: true, deletedAt: null });
    const suppliers = await Supplier.find({ deletedAt: null }).lean();

    const nodes = [
      ...warehouses.map(w => ({
        id: w._id.toString(),
        name: w.name,
        type: 'WAREHOUSE',
        latitude: w.address?.latitude,
        longitude: w.address?.longitude,
        address: w.location
      })),
      ...suppliers.map(s => ({
        id: s._id.toString(),
        name: s.name,
        type: 'SUPPLIER',
        latitude: s.contactInfo?.address?.latitude,
        longitude: s.contactInfo?.address?.longitude,
        address: s.contactInfo?.address?.city
      })),
      {
        id: 'destination',
        name: 'Destination',
        type: 'DESTINATION',
        latitude: shipment.destinationAddress.latitude,
        longitude: shipment.destinationAddress.longitude
      }
    ];

    const edges = allRoutes.map(r => ({
      from: r.fromNode.nodeId.toString(),
      to: r.toNode.nodeId.toString(),
      distance: r.distance,
      cost: r.cost,
      time: r.estimatedTime
    }));

    if (edges.length === 0) {
      const { edges: autoEdges } = DijkstraRoutePlanner.buildGraphFromLocations(
        nodes.filter(n => n.latitude && n.longitude),
        5,
        60
      );
      edges.push(...autoEdges);
    }

    const planner = new DijkstraRoutePlanner(nodes, edges);

    let bestAlternative = null;
    let minCost = Infinity;

    for (const w of warehouses) {
      try {
        const path = planner.findOptimalPath(w._id.toString(), 'destination', 'COST');
        if (path.totalCost < minCost) {
          minCost = path.totalCost;
          bestAlternative = { warehouse: w, path };
        }
      } catch (err) {
        // No path
      }
    }

    if (!bestAlternative) {
      return res.status(400).json({ message: 'No alternative routing could be found' });
    }

    shipment.originAddress = bestAlternative.warehouse._id;
    shipment.notes = (shipment.notes || '') + `\nRe-routed dynamically due to stockout at warehouse ${outOfStockWarehouseId}`;
    await shipment.save();

    res.json({
      message: 'Shipment successfully re-routed',
      alternativeWarehouse: bestAlternative.warehouse,
      optimalPath: bestAlternative.path
    });
  } catch (error) {
    logger.error('Dynamic re-routing error', { error: error.message });
    res.status(500).json({
      message: 'Error re-routing shipment',
      error: error.message,
      status: 500
    });
  }
});

export default router;
