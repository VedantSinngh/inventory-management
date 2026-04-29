import express from 'express';
import Shipment from '../models/Shipment.js';
import Order from '../models/Order.js';
import { protect } from '../middleware/auth.js';
import MapService from '../services/mapService.js';
import WeatherService from '../services/weatherService.js';
import RouteOptimizationService from '../services/routeOptimizationService.js';

const router = express.Router();

// Get all shipments
router.get('/', protect, async (req, res) => {
  try {
    const { status, carrier, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (carrier) query.carrier = carrier;

    const shipments = await Shipment.find(query)
      .populate('order', 'type totalAmount')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Shipment.countDocuments(query);

    res.json({
      shipments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shipments', error: error.message });
  }
});

// Get shipment by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('order', 'type totalAmount items')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shipment', error: error.message });
  }
});

// Create new shipment
router.post('/', protect, async (req, res) => {
  try {
    const {
      orderId,
      carrier,
      carrierTrackingUrl,
      originAddress,
      destinationAddress,
      weight,
      dimensions,
      items
    } = req.body;

    // Verify order exists and is ready for shipment
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['APPROVED', 'PROCESSING'].includes(order.status)) {
      return res.status(400).json({ message: 'Order is not ready for shipment' });
    }

    // Geocode addresses
    let originCoords, destinationCoords;
    try {
      originCoords = await MapService.geocodeAddress(originAddress);
      destinationCoords = await MapService.geocodeAddress(destinationAddress);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid address format', error: error.message });
    }

    // Calculate route and ETA
    const route = await MapService.getRoute(
      { latitude: originCoords.latitude, longitude: originCoords.longitude },
      { latitude: destinationCoords.latitude, longitude: destinationCoords.longitude }
    );

    const eta = await RouteOptimizationService.calculateETA(
      { latitude: originCoords.latitude, longitude: originCoords.longitude },
      { latitude: destinationCoords.latitude, longitude: destinationCoords.longitude }
    );

    // Check weather impact
    const weatherImpact = await WeatherService.analyzeLogisticsImpact(route);

    const shipment = new Shipment({
      order: orderId,
      trackingNumber: `SHP${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      carrier,
      carrierTrackingUrl,
      originAddress: {
        ...originAddress,
        latitude: originCoords.latitude,
        longitude: originCoords.longitude
      },
      destinationAddress: {
        ...destinationAddress,
        latitude: destinationCoords.latitude,
        longitude: destinationCoords.longitude
      },
      estimatedDeliveryDate: eta.adjustedETA,
      weatherImpact,
      weight,
      dimensions,
      items,
      createdBy: req.user.id
    });

    await shipment.save();

    // Update order status
    order.status = 'SHIPPED';
    order.shipments.push(shipment._id);
    await order.save();

    res.status(201).json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating shipment', error: error.message });
  }
});

// Update shipment status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    shipment.status = status;
    shipment.updatedBy = req.user.id;

    if (status === 'DELIVERED') {
      shipment.actualDeliveryDate = new Date();
    }

    if (notes) {
      shipment.notes.push({
        type: 'STATUS_UPDATE',
        message: `Status changed to ${status}`,
        details: notes,
        timestamp: new Date()
      });
    }

    await shipment.save();

    // Update order status if all shipments are delivered
    if (status === 'DELIVERED') {
      const order = await Order.findById(shipment.order);
      const allShipmentsDelivered = await Shipment.find({
        order: shipment.order,
        status: { $ne: 'DELIVERED' }
      });

      if (allShipmentsDelivered.length === 0) {
        order.status = 'DELIVERED';
        await order.save();
      }
    }

    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shipment status', error: error.message });
  }
});

// Update shipment location (for live tracking)
router.put('/:id/location', protect, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    shipment.currentLocation = {
      latitude,
      longitude,
      address,
      timestamp: new Date()
    };

    // Add to route history
    shipment.route.push({
      latitude,
      longitude,
      timestamp: new Date(),
      status: shipment.status
    });

    shipment.updatedBy = req.user.id;
    await shipment.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('shipment-update', {
      shipmentId: shipment._id,
      location: shipment.currentLocation,
      status: shipment.status
    });

    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shipment location', error: error.message });
  }
});

// Get shipment route
router.get('/:id/route', protect, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    const route = await MapService.getRoute(
      shipment.originAddress,
      shipment.destinationAddress
    );

    res.json({
      shipment: shipment._id,
      route,
      currentLocation: shipment.currentLocation,
      waypoints: shipment.route
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shipment route', error: error.message });
  }
});

// Get weather impact for shipment
router.get('/:id/weather', protect, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    const route = await MapService.getRoute(
      shipment.originAddress,
      shipment.destinationAddress
    );

    const weatherImpact = await WeatherService.analyzeLogisticsImpact(route);

    res.json({
      shipment: shipment._id,
      weatherImpact,
      route,
      recommendations: weatherImpact.recommendations || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weather impact', error: error.message });
  }
});

// Assign vehicle to shipment
router.put('/:id/assign-vehicle', protect, async (req, res) => {
  try {
    const { vehicleId, driverInfo } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    shipment.assignedVehicle = vehicleId;
    shipment.driverInfo = driverInfo;
    shipment.updatedBy = req.user.id;

    await shipment.save();

    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Error assigning vehicle', error: error.message });
  }
});

// Get tracking URL
router.get('/:id/tracking-url', protect, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    let trackingUrl = shipment.carrierTrackingUrl;
    if (!trackingUrl && shipment.carrier && shipment.trackingNumber) {
      // Generate carrier-specific tracking URLs
      const carrierUrls = {
        'FedEx': `https://www.fedex.com/en-us/tracking.html?tracknumbers=${shipment.trackingNumber}`,
        'UPS': `https://www.ups.com/track?tracknum=${shipment.trackingNumber}`,
        'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${shipment.trackingNumber}`,
        'USPS': `https://tools.usps.com/go/TrackConfirmAction.action?tLabels=${shipment.trackingNumber}`
      };
      trackingUrl = carrierUrls[shipment.carrier];
    }

    res.json({
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      trackingUrl,
      status: shipment.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating tracking URL', error: error.message });
  }
});

export default router;