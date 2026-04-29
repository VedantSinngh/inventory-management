import axios from 'axios';

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.geoUrl = 'https://api.openweathermap.org/geo/1.0';
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        visibility: response.data.visibility,
        windSpeed: response.data.wind.speed,
        windDirection: response.data.wind.deg,
        weather: response.data.weather[0].main,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        timestamp: new Date(response.data.dt * 1000)
      };
    } catch (error) {
      console.error('Weather API error:', error);
      throw new Error('Failed to fetch current weather');
    }
  }

  /**
   * Get weather forecast for next 5 days
   */
  async getForecast(lat, lon, days = 5) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      // Group by date and get daily summaries
      const dailyForecast = {};
      response.data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyForecast[date]) {
          dailyForecast[date] = {
            date,
            temps: [],
            humidities: [],
            weather: [],
            windSpeeds: []
          };
        }

        dailyForecast[date].temps.push(item.main.temp);
        dailyForecast[date].humidities.push(item.main.humidity);
        dailyForecast[date].weather.push(item.weather[0].main);
        dailyForecast[date].windSpeeds.push(item.wind.speed);
      });

      return Object.values(dailyForecast).slice(0, days).map(day => ({
        date: day.date,
        avgTemp: day.temps.reduce((a, b) => a + b) / day.temps.length,
        minTemp: Math.min(...day.temps),
        maxTemp: Math.max(...day.temps),
        avgHumidity: day.humidities.reduce((a, b) => a + b) / day.humidities.length,
        avgWindSpeed: day.windSpeeds.reduce((a, b) => a + b) / day.windSpeeds.length,
        dominantWeather: this.getMostFrequent(day.weather),
        conditions: [...new Set(day.weather)] // Unique weather conditions
      }));
    } catch (error) {
      console.error('Forecast API error:', error);
      throw new Error('Failed to fetch weather forecast');
    }
  }

  /**
   * Analyze weather impact on logistics
   */
  async analyzeLogisticsImpact(route, departureTime = new Date()) {
    try {
      const impacts = [];

      // Check weather at key points along the route
      const routePoints = this.sampleRoutePoints(route.geometry, 10); // Sample 10 points

      for (const point of routePoints) {
        const weather = await this.getCurrentWeather(point[1], point[0]); // [lat, lng]
        const forecast = await this.getForecast(point[1], point[0], 2); // 2-day forecast

        const impact = this.calculateWeatherImpact(weather, forecast[0], departureTime);
        if (impact.hasImpact) {
          impacts.push({
            location: point,
            weather,
            impact
          });
        }
      }

      // Aggregate impacts
      const aggregatedImpact = {
        hasImpact: impacts.length > 0,
        severity: this.aggregateSeverity(impacts),
        estimatedDelay: Math.max(...impacts.map(i => i.impact.estimatedDelayHours || 0)),
        conditions: [...new Set(impacts.map(i => i.weather.weather))],
        recommendations: this.generateRecommendations(impacts)
      };

      return aggregatedImpact;
    } catch (error) {
      console.error('Logistics impact analysis error:', error);
      return { hasImpact: false, severity: 'LOW', estimatedDelay: 0 };
    }
  }

  /**
   * Calculate weather impact on delivery
   */
  calculateWeatherImpact(currentWeather, forecast, departureTime) {
    const impact = {
      hasImpact: false,
      severity: 'LOW',
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
    if (['Rain', 'Drizzle', 'Snow'].includes(currentWeather.weather)) {
      impact.hasImpact = true;
      impact.severity = currentWeather.weather === 'Snow' ? 'HIGH' : 'MEDIUM';
      impact.reasons.push(`${currentWeather.weather} may cause road delays`);
      impact.estimatedDelayHours += currentWeather.weather === 'Snow' ? 4 : 1;
    }

    // Wind impacts
    if (currentWeather.windSpeed > 15) {
      impact.hasImpact = true;
      impact.severity = currentWeather.windSpeed > 25 ? 'HIGH' : 'MEDIUM';
      impact.reasons.push('High winds may affect vehicle stability');
      impact.estimatedDelayHours += currentWeather.windSpeed > 25 ? 2 : 0.5;
    }

    // Visibility impacts
    if (currentWeather.visibility && currentWeather.visibility < 1000) {
      impact.hasImpact = true;
      impact.severity = 'HIGH';
      impact.reasons.push('Poor visibility may cause safety concerns');
      impact.estimatedDelayHours += 2;
    }

    // Forecast impacts (next 24 hours)
    if (forecast) {
      if (forecast.minTemp < -5) {
        impact.hasImpact = true;
        impact.reasons.push('Extreme cold forecast may cause delays');
        impact.estimatedDelayHours = Math.max(impact.estimatedDelayHours, 3);
      }

      if (forecast.dominantWeather === 'Snow') {
        impact.hasImpact = true;
        impact.severity = 'HIGH';
        impact.reasons.push('Snow forecast may cause significant delays');
        impact.estimatedDelayHours = Math.max(impact.estimatedDelayHours, 6);
      }
    }

    // Adjust severity based on delay
    if (impact.estimatedDelayHours > 4) {
      impact.severity = 'HIGH';
    } else if (impact.estimatedDelayHours > 1) {
      impact.severity = 'MEDIUM';
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
    if (severities.includes('HIGH')) return 'HIGH';
    if (severities.includes('MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate recommendations based on weather impacts
   */
  generateRecommendations(impacts) {
    const recommendations = [];

    if (impacts.some(i => i.weather.weather === 'Snow')) {
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
    return arr.sort((a,b) =>
      arr.filter(v => v===a).length - arr.filter(v => v===b).length
    ).pop();
  }
}

export default new WeatherService();