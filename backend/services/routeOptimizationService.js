import MapService from './mapService.js';
import WeatherService from './weatherService.js';

class RouteOptimizationService {
  constructor() {
    this.mapService = MapService;
    this.weatherService = WeatherService;
  }

  /**
   * Optimize routes for multiple shipments
   */
  async optimizeRoutes(shipments, options = {}) {
    const {
      maxVehicles = 5,
      vehicleCapacity = 1000, // kg
      maxRouteTime = 8 * 3600, // 8 hours in seconds
      depotLocation = null
    } = options;

    try {
      // Extract delivery points
      const deliveryPoints = shipments.map(shipment => ({
        id: shipment._id,
        location: shipment.destinationAddress,
        weight: shipment.weight || 0,
        volume: this.calculateVolume(shipment.dimensions),
        timeWindow: this.getTimeWindow(shipment),
        priority: shipment.priority || 'NORMAL'
      }));

      // Add depot if specified
      if (depotLocation) {
        deliveryPoints.unshift({
          id: 'depot',
          location: depotLocation,
          weight: 0,
          volume: 0,
          isDepot: true
        });
      }

      // Get distance matrix
      const locations = deliveryPoints.map(p => ({
        latitude: p.location.latitude,
        longitude: p.location.longitude
      }));

      const distanceMatrix = await this.mapService.getDistanceMatrix(locations, locations);

      // Apply optimization algorithm (simplified VRP)
      const routes = await this.solveVRP(deliveryPoints, distanceMatrix, {
        maxVehicles,
        vehicleCapacity,
        maxRouteTime
      });

      // Calculate route details
      const optimizedRoutes = await Promise.all(
        routes.map(route => this.calculateRouteDetails(route, distanceMatrix))
      );

      return {
        routes: optimizedRoutes,
        totalDistance: optimizedRoutes.reduce((sum, r) => sum + r.totalDistance, 0),
        totalTime: optimizedRoutes.reduce((sum, r) => sum + r.totalTime, 0),
        vehicleUtilization: this.calculateUtilization(optimizedRoutes, vehicleCapacity)
      };

    } catch (error) {
      console.error('Route optimization error:', error);
      throw new Error('Failed to optimize routes');
    }
  }

  /**
   * Solve Vehicle Routing Problem (simplified implementation)
   */
  async solveVRP(points, distanceMatrix, constraints) {
    const { maxVehicles, vehicleCapacity, maxRouteTime } = constraints;
    const routes = [];
    const unassigned = [...points.filter(p => !p.isDepot)];

    // Sort by priority and distance from depot
    unassigned.sort((a, b) => {
      const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // If same priority, sort by distance from depot
      const depotIndex = points.findIndex(p => p.isDepot);
      if (depotIndex >= 0) {
        return distanceMatrix[depotIndex][points.indexOf(a)] - distanceMatrix[depotIndex][points.indexOf(b)];
      }

      return 0;
    });

    // Assign points to vehicles using nearest neighbor with capacity constraints
    for (let vehicle = 0; vehicle < maxVehicles && unassigned.length > 0; vehicle++) {
      const route = [];
      let currentLoad = 0;
      let currentTime = 0;
      let currentIndex = points.findIndex(p => p.isDepot);

      while (unassigned.length > 0) {
        // Find nearest feasible point
        let nearestIndex = -1;
        let nearestDistance = Infinity;

        for (let i = 0; i < unassigned.length; i++) {
          const point = unassigned[i];
          const pointIndex = points.indexOf(point);
          const distance = distanceMatrix[currentIndex][pointIndex];
          const newLoad = currentLoad + point.weight;
          const travelTime = distance / 50000 * 3600; // Rough estimate: 50 km/h average
          const newTime = currentTime + travelTime;

          // Check constraints
          if (newLoad <= vehicleCapacity &&
              newTime <= maxRouteTime &&
              distance < nearestDistance) {
            nearestIndex = i;
            nearestDistance = distance;
          }
        }

        if (nearestIndex === -1) break; // No feasible point found

        const assignedPoint = unassigned.splice(nearestIndex, 0)[0];
        route.push(assignedPoint);
        currentLoad += assignedPoint.weight;
        currentTime += nearestDistance / 50000 * 3600;
        currentIndex = points.indexOf(assignedPoint);
      }

      if (route.length > 0) {
        routes.push(route);
      }
    }

    // Handle any remaining unassigned points (would need more sophisticated algorithm)
    if (unassigned.length > 0) {
      console.warn(`${unassigned.length} points could not be assigned to routes`);
    }

    return routes;
  }

  /**
   * Calculate detailed route information
   */
  async calculateRouteDetails(route, distanceMatrix) {
    const routeDetails = {
      stops: [],
      totalDistance: 0,
      totalTime: 0,
      totalWeight: 0,
      weatherImpacts: []
    };

    let currentIndex = 0; // Start from depot

    for (let i = 0; i < route.length; i++) {
      const point = route[i];
      const pointIndex = points.indexOf(point);

      // Calculate segment
      const segmentDistance = distanceMatrix[currentIndex][pointIndex];
      const segmentTime = segmentDistance / 50000 * 3600; // Rough estimate

      routeDetails.stops.push({
        point,
        arrivalTime: new Date(Date.now() + routeDetails.totalTime * 1000),
        distanceFromPrevious: segmentDistance,
        timeFromPrevious: segmentTime
      });

      routeDetails.totalDistance += segmentDistance;
      routeDetails.totalTime += segmentTime;
      routeDetails.totalWeight += point.weight;

      // Check weather impact
      try {
        const weatherImpact = await this.weatherService.analyzeLogisticsImpact(
          { geometry: { coordinates: [[point.location.longitude, point.location.latitude]] } }
        );
        if (weatherImpact.hasImpact) {
          routeDetails.weatherImpacts.push({
            stop: i,
            impact: weatherImpact
          });
        }
      } catch (error) {
        console.warn('Weather impact check failed:', error);
      }

      currentIndex = pointIndex;
    }

    return routeDetails;
  }

  /**
   * Calculate ETA with weather considerations
   */
  async calculateETA(origin, destination, departureTime = new Date(), options = {}) {
    try {
      // Get basic route
      const route = await this.mapService.getRoute(origin, destination, options);

      // Analyze weather impact
      const weatherImpact = await this.weatherService.analyzeLogisticsImpact(route, departureTime);

      // Calculate adjusted ETA
      const baseDuration = route.duration; // seconds
      const weatherDelay = (weatherImpact.estimatedDelay || 0) * 3600; // Convert hours to seconds
      const trafficFactor = options.trafficFactor || 1.2; // Default 20% traffic delay
      const adjustedDuration = (baseDuration * trafficFactor) + weatherDelay;

      const eta = new Date(departureTime.getTime() + (adjustedDuration * 1000));

      return {
        baseETA: new Date(departureTime.getTime() + (baseDuration * 1000)),
        adjustedETA: eta,
        weatherDelay: weatherDelay / 3600, // hours
        confidence: this.calculateConfidence(weatherImpact),
        factors: {
          baseDuration: baseDuration / 3600,
          trafficFactor,
          weatherImpact: weatherImpact.hasImpact ? weatherImpact.severity : 'NONE'
        }
      };

    } catch (error) {
      console.error('ETA calculation error:', error);
      // Fallback to basic calculation
      const distance = this.calculateDistance(origin, destination);
      const estimatedDuration = (distance / 50000) * 3600; // Rough estimate
      return {
        adjustedETA: new Date(departureTime.getTime() + (estimatedDuration * 1000)),
        confidence: 'LOW',
        factors: { estimated: true }
      };
    }
  }

  /**
   * Assign shipments to fleet vehicles
   */
  async assignFleet(shipments, fleet) {
    const assignments = [];

    // Sort shipments by priority and deadline
    const sortedShipments = shipments.sort((a, b) => {
      const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by estimated delivery date
      return new Date(a.estimatedDeliveryDate) - new Date(b.estimatedDeliveryDate);
    });

    // Sort fleet by capacity and availability
    const availableFleet = fleet.filter(vehicle => vehicle.status === 'AVAILABLE')
      .sort((a, b) => b.capacity - a.capacity);

    for (const shipment of sortedShipments) {
      // Find suitable vehicle
      const suitableVehicle = availableFleet.find(vehicle => {
        const loadRatio = shipment.weight / vehicle.capacity;
        const timeAvailable = vehicle.availableUntil > new Date();
        return loadRatio <= 1 && timeAvailable;
      });

      if (suitableVehicle) {
        assignments.push({
          shipment: shipment._id,
          vehicle: suitableVehicle.id,
          assignedAt: new Date(),
          estimatedDeparture: new Date(),
          estimatedArrival: shipment.estimatedDeliveryDate
        });

        // Mark vehicle as assigned (simplified)
        suitableVehicle.status = 'ASSIGNED';
      } else {
        assignments.push({
          shipment: shipment._id,
          vehicle: null,
          status: 'UNASSIGNED',
          reason: 'No suitable vehicle available'
        });
      }
    }

    return assignments;
  }

  // Helper methods
  calculateVolume(dimensions) {
    if (!dimensions) return 0;
    return (dimensions.length * dimensions.width * dimensions.height) / 1000000; // Convert to cubic meters
  }

  getTimeWindow(shipment) {
    // Default time window: 9 AM to 5 PM
    return {
      start: '09:00',
      end: '17:00'
    };
  }

  calculateDistance(point1, point2) {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateUtilization(routes, vehicleCapacity) {
    return routes.map(route => ({
      vehicleIndex: routes.indexOf(route),
      utilization: (route.totalWeight / vehicleCapacity) * 100
    }));
  }

  calculateConfidence(weatherImpact) {
    if (!weatherImpact.hasImpact) return 'HIGH';
    if (weatherImpact.severity === 'LOW') return 'MEDIUM';
    return 'LOW';
  }
}

export default new RouteOptimizationService();