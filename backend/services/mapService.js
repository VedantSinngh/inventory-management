import axios from 'axios';

class MapService {
  constructor() {
    this.apiKey = process.env.MAPBOX_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    this.provider = process.env.MAPS_PROVIDER || 'mapbox'; // 'mapbox' or 'google'
    this.baseUrls = {
      mapbox: 'https://api.mapbox.com',
      google: 'https://maps.googleapis.com/maps/api'
    };
  }

  /**
   * Get coordinates for an address
   */
  async geocodeAddress(address) {
    try {
      const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

      if (this.provider === 'mapbox') {
        const response = await axios.get(`${this.baseUrls.mapbox}/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`, {
          params: {
            access_token: this.apiKey,
            limit: 1
          }
        });

        if (response.data.features && response.data.features.length > 0) {
          const [lng, lat] = response.data.features[0].center;
          return {
            latitude: lat,
            longitude: lng,
            address: response.data.features[0].place_name
          };
        }
      } else {
        const response = await axios.get(`${this.baseUrls.google}/geocode/json`, {
          params: {
            address: fullAddress,
            key: this.apiKey
          }
        });

        if (response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          return {
            latitude: location.lat,
            longitude: location.lng,
            address: response.data.results[0].formatted_address
          };
        }
      }

      throw new Error('Address not found');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Get route between two points
   */
  async getRoute(origin, destination, options = {}) {
    try {
      const { profile = 'driving', alternatives = false } = options;

      if (this.provider === 'mapbox') {
        const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

        const response = await axios.get(`${this.baseUrls.mapbox}/directions/v5/mapbox/${profile}/${coordinates}`, {
          params: {
            access_token: this.apiKey,
            geometries: 'geojson',
            overview: 'full',
            steps: true,
            alternatives
          }
        });

        if (response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          return {
            distance: route.distance, // meters
            duration: route.duration, // seconds
            geometry: route.geometry,
            steps: route.legs[0].steps.map(step => ({
              instruction: step.maneuver.instruction,
              distance: step.distance,
              duration: step.duration,
              geometry: step.geometry
            }))
          };
        }
      } else {
        // Google Directions API
        const response = await axios.get(`${this.baseUrls.google}/directions/json`, {
          params: {
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            mode: profile,
            key: this.apiKey,
            alternatives
          }
        });

        if (response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          const leg = route.legs[0];
          return {
            distance: leg.distance.value, // meters
            duration: leg.duration.value, // seconds
            geometry: this.decodePolyline(route.overview_polyline.points),
            steps: leg.steps.map(step => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
              distance: step.distance.value,
              duration: step.duration.value,
              geometry: this.decodePolyline(step.polyline.points)
            }))
          };
        }
      }

      throw new Error('Route not found');
    } catch (error) {
      console.error('Route calculation error:', error);
      throw new Error('Failed to calculate route');
    }
  }

  /**
   * Get optimized route for multiple stops
   */
  async getOptimizedRoute(stops, options = {}) {
    try {
      const { profile = 'driving' } = options;

      if (this.provider === 'mapbox') {
        // Use Mapbox Optimization API
        const coordinates = stops.map(stop => `${stop.longitude},${stop.latitude}`).join(';');

        const response = await axios.get(`${this.baseUrls.mapbox}/optimized-trips/v1/mapbox/${profile}/${coordinates}`, {
          params: {
            access_token: this.apiKey,
            roundtrip: false,
            source: 'first',
            destination: 'last'
          }
        });

        if (response.data.trips && response.data.trips.length > 0) {
          const trip = response.data.trips[0];
          return {
            optimizedOrder: trip.waypoints.map(wp => wp.waypoint_index),
            distance: trip.distance,
            duration: trip.duration,
            geometry: trip.geometry
          };
        }
      } else {
        // Google Directions API with waypoints optimization
        const origin = stops[0];
        const destination = stops[stops.length - 1];
        const waypoints = stops.slice(1, -1).map(stop => `${stop.latitude},${stop.longitude}`).join('|');

        const response = await axios.get(`${this.baseUrls.google}/directions/json`, {
          params: {
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            waypoints: `optimize:true|${waypoints}`,
            mode: profile,
            key: this.apiKey
          }
        });

        if (response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          const waypointOrder = route.waypoint_order || [];
          return {
            optimizedOrder: [0, ...waypointOrder.map(i => i + 1), stops.length - 1],
            distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
            duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
            geometry: this.decodePolyline(route.overview_polyline.points)
          };
        }
      }

      throw new Error('Optimized route not found');
    } catch (error) {
      console.error('Route optimization error:', error);
      throw new Error('Failed to optimize route');
    }
  }

  /**
   * Decode Google Polyline
   */
  decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push([lat * 1e-5, lng * 1e-5]);
    }

    return points;
  }

  /**
   * Get distance matrix between multiple points
   */
  async getDistanceMatrix(origins, destinations) {
    try {
      if (this.provider === 'google') {
        const originsStr = origins.map(o => `${o.latitude},${o.longitude}`).join('|');
        const destinationsStr = destinations.map(d => `${d.latitude},${d.longitude}`).join('|');

        const response = await axios.get(`${this.baseUrls.google}/distancematrix/json`, {
          params: {
            origins: originsStr,
            destinations: destinationsStr,
            key: this.apiKey
          }
        });

        return response.data.rows.map(row =>
          row.elements.map(element => ({
            distance: element.distance?.value || 0,
            duration: element.duration?.value || 0,
            status: element.status
          }))
        );
      }

      // For Mapbox, we'd need to make multiple API calls
      // This is a simplified implementation
      const matrix = [];
      for (const origin of origins) {
        const row = [];
        for (const destination of destinations) {
          try {
            const route = await this.getRoute(origin, destination);
            row.push({
              distance: route.distance,
              duration: route.duration,
              status: 'OK'
            });
          } catch (error) {
            row.push({
              distance: 0,
              duration: 0,
              status: 'ERROR'
            });
          }
        }
        matrix.push(row);
      }

      return matrix;
    } catch (error) {
      console.error('Distance matrix error:', error);
      throw new Error('Failed to get distance matrix');
    }
  }
}

export default new MapService();