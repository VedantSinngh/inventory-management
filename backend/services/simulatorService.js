import Shipment from '../models/Shipment.js';
import MapService from './mapService.js';

class SimulatorService {
  constructor() {
    this.activeSimulations = new Map();
  }

  async startSimulation(shipmentId, io) {
    if (this.activeSimulations.has(shipmentId)) {
      throw new Error('Simulation already running for this shipment');
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');
    if (shipment.status === 'DELIVERED') throw new Error('Shipment already delivered');

    // Get Route
    const route = await MapService.getRoute(shipment.originAddress, shipment.destinationAddress);
    if (!route || !route.geometry || !route.geometry.coordinates) {
        throw new Error('Could not generate route geometry for simulation');
    }

    // Extract coordinate path (GeoJSON gives [longitude, latitude])
    const path = route.geometry.coordinates.map(coord => ({
        longitude: coord[0],
        latitude: coord[1],
        address: 'In Transit (Simulated)'
    }));

    if (path.length === 0) throw new Error('Empty route path');

    // To prevent the simulation from taking hours, we'll sample the path 
    // to max 50 points so it finishes in a few minutes
    const stepSize = Math.max(1, Math.floor(path.length / 50));
    const sampledPath = path.filter((_, idx) => idx % stepSize === 0);
    // ensure last point is the exact destination
    sampledPath.push({
        longitude: shipment.destinationAddress.longitude,
        latitude: shipment.destinationAddress.latitude,
        address: 'Arrived at Destination'
    });

    let currentIndex = 0;

    const intervalId = setInterval(async () => {
      if (currentIndex >= sampledPath.length) {
        this.stopSimulation(shipmentId);
        
        // Mark as delivered
        const finalShipment = await Shipment.findById(shipmentId);
        finalShipment.status = 'DELIVERED';
        finalShipment.actualDeliveryDate = new Date();
        await finalShipment.save();
        
        io.emit('shipment-update', {
          shipmentId: finalShipment._id,
          location: finalShipment.currentLocation,
          status: 'DELIVERED'
        });
        return;
      }

      const point = sampledPath[currentIndex];
      
      // Update DB
      const currentShipment = await Shipment.findById(shipmentId);
      currentShipment.currentLocation = {
          latitude: point.latitude,
          longitude: point.longitude,
          address: point.address,
          timestamp: new Date()
      };
      
      currentShipment.route.push({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: new Date(),
          status: currentShipment.status
      });
      await currentShipment.save();

      // Emit Socket Update
      io.emit('shipment-update', {
          shipmentId: currentShipment._id,
          location: currentShipment.currentLocation,
          status: currentShipment.status
      });

      currentIndex++;
    }, 5000); // 5 seconds per tick

    this.activeSimulations.set(shipmentId, intervalId);
    return true;
  }

  stopSimulation(shipmentId) {
    if (this.activeSimulations.has(shipmentId)) {
      clearInterval(this.activeSimulations.get(shipmentId));
      this.activeSimulations.delete(shipmentId);
      return true;
    }
    return false;
  }

  isSimulating(shipmentId) {
      return this.activeSimulations.has(shipmentId);
  }
}

export default new SimulatorService();
