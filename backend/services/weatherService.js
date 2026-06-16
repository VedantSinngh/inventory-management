import axios from 'axios';

const WEATHER_CODES = {
  0: { condition: 'clear', severity: 'none' },
  1: { condition: 'mainly_clear', severity: 'none' },
  2: { condition: 'partly_cloudy', severity: 'low' },
  3: { condition: 'overcast', severity: 'low' },
  45: { condition: 'fog', severity: 'medium' },
  48: { condition: 'fog', severity: 'medium' },
  51: { condition: 'drizzle', severity: 'low' },
  53: { condition: 'drizzle', severity: 'low' },
  55: { condition: 'drizzle', severity: 'medium' },
  61: { condition: 'rain', severity: 'medium' },
  63: { condition: 'rain', severity: 'medium' },
  65: { condition: 'heavy_rain', severity: 'high' },
  71: { condition: 'snow', severity: 'medium' },
  73: { condition: 'snow', severity: 'high' },
  75: { condition: 'heavy_snow', severity: 'high' },
  80: { condition: 'showers', severity: 'medium' },
  81: { condition: 'showers', severity: 'high' },
  82: { condition: 'violent_showers', severity: 'critical' },
  95: { condition: 'thunderstorm', severity: 'high' },
  96: { condition: 'thunderstorm_hail', severity: 'critical' },
  99: { condition: 'thunderstorm_hail', severity: 'critical' }
};

class WeatherService {
  constructor() {
    this.baseUrl = 'https://api.open-meteo.com/v1/forecast';
  }

  /**
   * Helper to get weather representation code
   */
  _getMappedWeather(code) {
    return WEATHER_CODES[code] || { condition: 'clear', severity: 'none' };
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(lat = 19.0760, lon = 72.8777) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latitude: lat,
          longitude: lon,
          current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code'
        }
      });

      const current = response.data.current;
      const wcode = current ? current.weather_code : 0;
      const mapped = this._getMappedWeather(wcode);

      return {
        temperature: current ? current.temperature_2m : 25,
        humidity: current ? current.relative_humidity_2m : 60,
        pressure: 1013,
        visibility: 10000,
        windSpeed: current ? current.wind_speed_10m : 5,
        windDirection: current ? current.wind_direction_10m : 180,
        weather: mapped.condition,
        description: mapped.condition.replace(/_/g, ' '),
        icon: String(wcode),
        timestamp: current ? new Date(current.time) : new Date()
      };
    } catch (error) {
      console.error('Open-Meteo Current Weather API error:', error);
      return {
        temperature: 25,
        humidity: 60,
        pressure: 1013,
        visibility: 10000,
        windSpeed: 5,
        windDirection: 180,
        weather: 'clear',
        description: 'clear sky',
        icon: '0',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get weather forecast for next 5 days
   */
  async getForecast(lat = 19.0760, lon = 72.8777, days = 5) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latitude: lat,
          longitude: lon,
          hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
        }
      });

      const hourly = response.data.hourly;
      if (!hourly || !hourly.time) {
        throw new Error('No hourly data returned');
      }

      const dailyForecast = {};
      hourly.time.forEach((timeStr, idx) => {
        const date = new Date(timeStr).toDateString();
        if (!dailyForecast[date]) {
          dailyForecast[date] = {
            date,
            temps: [],
            humidities: [],
            weather: [],
            windSpeeds: []
          };
        }

        dailyForecast[date].temps.push(hourly.temperature_2m[idx] || 25);
        dailyForecast[date].humidities.push(hourly.relative_humidity_2m[idx] || 60);
        const wcode = hourly.weather_code[idx] || 0;
        const mapped = this._getMappedWeather(wcode);
        dailyForecast[date].weather.push(mapped.condition);
        dailyForecast[date].windSpeeds.push(hourly.wind_speed_10m[idx] || 5);
      });

      return Object.values(dailyForecast).slice(0, days).map(day => ({
        date: day.date,
        avgTemp: day.temps.reduce((a, b) => a + b, 0) / day.temps.length,
        minTemp: Math.min(...day.temps),
        maxTemp: Math.max(...day.temps),
        avgHumidity: day.humidities.reduce((a, b) => a + b, 0) / day.humidities.length,
        avgWindSpeed: day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length,
        dominantWeather: this.getMostFrequent(day.weather),
        conditions: [...new Set(day.weather)]
      }));
    } catch (error) {
      console.error('Open-Meteo Forecast API error:', error);
      return Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          date: d.toDateString(),
          avgTemp: 25,
          minTemp: 20,
          maxTemp: 30,
          avgHumidity: 60,
          avgWindSpeed: 5,
          dominantWeather: 'clear',
          conditions: ['clear']
        };
      });
    }
  }

  /**
   * Keep getWeatherForLocation signature (maps to getCurrentWeather)
   */
  async getWeatherForLocation(lat, lon) {
    return this.getCurrentWeather(lat, lon);
  }

  /**
   * Keep assessWeatherRisk signature
   */
  async assessWeatherRisk(lat, lon) {
    const weather = await this.getCurrentWeather(lat, lon);
    const impact = this.calculateWeatherImpact(weather, null, new Date());
    return {
      riskLevel: impact.severity,
      temp: weather.temperature,
      condition: weather.weather,
      description: weather.description,
      windSpeed: weather.windSpeed,
      humidity: weather.humidity
    };
  }

  /**
   * Keep getWeatherImpact signature
   */
  async getWeatherImpact(shipment) {
    const coords = shipment?.currentLocation?.coordinates || shipment?.destination?.coordinates || [72.8777, 19.0760];
    const lat = coords[1];
    const lon = coords[0];
    const weather = await this.getCurrentWeather(lat, lon);
    const impact = this.calculateWeatherImpact(weather, null, new Date());
    return {
      hasImpact: impact.hasImpact,
      severity: impact.severity,
      estimatedDelayHours: impact.estimatedDelayHours,
      reasons: impact.reasons,
      weather
    };
  }

  /**
   * Analyze weather impact on logistics
   */
  async analyzeLogisticsImpact(route, departureTime = new Date()) {
    try {
      const impacts = [];
      const routePoints = this.sampleRoutePoints(route.geometry, 5); // Sample 5 points to prevent spamming

      for (const point of routePoints) {
        const weather = await this.getCurrentWeather(point[1], point[0]); // [lat, lng]
        const impact = this.calculateWeatherImpact(weather, null, departureTime);
        if (impact.hasImpact) {
          impacts.push({
            location: point,
            weather,
            impact
          });
        }
      }

      const aggregatedImpact = {
        hasImpact: impacts.length > 0,
        severity: this.aggregateSeverity(impacts),
        estimatedDelay: impacts.length > 0 ? Math.max(...impacts.map(i => i.impact.estimatedDelayHours || 0)) : 0,
        conditions: [...new Set(impacts.map(i => i.weather.weather))],
        recommendations: this.generateRecommendations(impacts)
      };

      return aggregatedImpact;
    } catch (error) {
      console.error('Logistics impact analysis error:', error);
      return { hasImpact: false, severity: 'LOW', estimatedDelay: 0, conditions: [], recommendations: [] };
    }
  }

  /**
   * Calculate weather impact on delivery
   */
  calculateWeatherImpact(currentWeather, forecast, departureTime) {
    const impact = {
      hasImpact: false,
      severity: 'none',
      estimatedDelayHours: 0,
      reasons: []
    };

    // Temperature impacts
    if (currentWeather.temperature < 0) {
      impact.hasImpact = true;
      impact.reasons.push('Freezing temperatures may affect vehicle performance');
      impact.estimatedDelayHours += 1;
    }

    if (currentWeather.temperature > 35) {
      impact.hasImpact = true;
      impact.reasons.push('Extreme heat may affect cargo and driver safety');
      impact.estimatedDelayHours += 0.5;
    }

    // Precipitation impacts
    const condition = currentWeather.weather.toLowerCase();
    if (['rain', 'heavy_rain', 'drizzle', 'snow', 'heavy_snow', 'showers', 'thunderstorm', 'thunderstorm_hail'].includes(condition)) {
      impact.hasImpact = true;
      const isSnow = condition.includes('snow');
      const isCritical = ['thunderstorm_hail', 'violent_showers'].includes(condition);
      
      impact.severity = isSnow ? 'high' : (isCritical ? 'critical' : 'medium');
      impact.reasons.push(`${currentWeather.weather} condition may cause road delays`);
      impact.estimatedDelayHours += isSnow ? 4 : (isCritical ? 5 : 1);
    }

    // Wind impacts
    if (currentWeather.windSpeed > 15) {
      impact.hasImpact = true;
      impact.severity = currentWeather.windSpeed > 25 ? 'high' : 'medium';
      impact.reasons.push('High winds may affect vehicle stability');
      impact.estimatedDelayHours += currentWeather.windSpeed > 25 ? 2 : 0.5;
    }

    // Visibility impacts
    if (currentWeather.visibility && currentWeather.visibility < 1000) {
      impact.hasImpact = true;
      impact.severity = 'high';
      impact.reasons.push('Poor visibility may cause safety concerns');
      impact.estimatedDelayHours += 2;
    }

    // Adjust severity based on delay
    if (impact.estimatedDelayHours > 4) {
      impact.severity = 'high';
    } else if (impact.estimatedDelayHours > 1) {
      impact.severity = 'medium';
    } else if (impact.hasImpact) {
      impact.severity = 'low';
    }

    return impact;
  }

  /**
   * Sample points along a route geometry
   */
  sampleRoutePoints(geometry, numPoints) {
    if (!geometry || !geometry.coordinates) return [];
    const coords = geometry.coordinates;
    const totalPoints = coords.length;
    if (totalPoints <= numPoints) return coords;

    const step = Math.max(1, Math.floor(totalPoints / numPoints));
    const points = [];
    for (let i = 0; i < totalPoints; i += step) {
      points.push(coords[i]);
      if (points.length >= numPoints) break;
    }
    return points;
  }

  /**
   * Aggregate severity from multiple impacts
   */
  aggregateSeverity(impacts) {
    const severities = impacts.map(i => i.impact.severity);
    if (severities.includes('critical')) return 'CRITICAL';
    if (severities.includes('high')) return 'HIGH';
    if (severities.includes('medium')) return 'MEDIUM';
    if (severities.includes('low')) return 'LOW';
    return 'LOW';
  }

  /**
   * Generate recommendations based on weather impacts
   */
  generateRecommendations(impacts) {
    const recommendations = [];

    if (impacts.some(i => i.weather.weather.toLowerCase().includes('snow'))) {
      recommendations.push('Consider using snow chains or winter tires');
      recommendations.push('Monitor road conditions and be prepared for closures');
    }

    if (impacts.some(i => i.weather.temperature < 0)) {
      recommendations.push('Ensure antifreeze is adequate');
      recommendations.push('Monitor for icy road conditions');
    }

    if (impacts.some(i => i.weather.windSpeed > 15)) {
      recommendations.push('Secure cargo properly');
      recommendations.push('Drive cautiously in high winds');
    }

    if (impacts.some(i => i.impact.estimatedDelayHours > 2)) {
      recommendations.push('Consider rescheduling for better weather conditions');
      recommendations.push('Notify customer of potential delays');
    }

    return recommendations;
  }

  /**
   * Get most frequent item in array
   */
  getMostFrequent(arr) {
    if (arr.length === 0) return 'clear';
    return arr.sort((a,b) =>
      arr.filter(v => v===a).length - arr.filter(v => v===b).length
    ).pop();
  }
}

export default new WeatherService();