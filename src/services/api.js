// API Service for Riyadh School Planning Dashboard
const API_BASE_URL = 'https://n8n.hantoush.space/webhook';

class ApiService {
  async fetchWithRetry(url, options = {}, retries = 3) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  // 1. Capacity Analysis
  async getCapacityAnalysis() {
    try {
      const data = await this.fetchWithRetry(
        `${API_BASE_URL}/analyze-capacity`,
        { method: 'POST' }
      );
      return data;
    } catch (error) {
      console.error('Error fetching capacity analysis:', error);
      return null;
    }
  }

  // 2. Optimal Locations
  async getOptimalLocations() {
    try {
      const data = await this.fetchWithRetry(
        `${API_BASE_URL}/find-optimal-locations`,
        { method: 'POST' }
      );
      return data;
    } catch (error) {
      console.error('Error fetching optimal locations:', error);
      return null;
    }
  }

  // 3. Travel Time Heatmap
  async getTravelTimeHeatmap() {
    try {
      const data = await this.fetchWithRetry(
        `${API_BASE_URL}/travel-time-heatmap`,
        { method: 'POST' }
      );
      return data;
    } catch (error) {
      console.error('Error fetching travel time heatmap:', error);
      return null;
    }
  }

  // 4. Budget Optimizer
  async getBudgetOptimizer(budget = 1000000000) {
    try {
      const data = await this.fetchWithRetry(
        `${API_BASE_URL}/budget-optimizer`,
        {
          method: 'POST',
          body: JSON.stringify({ budget }),
        }
      );
      return data;
    } catch (error) {
      console.error('Error fetching budget optimizer:', error);
      return null;
    }
  }

  // 5. Forecast Scenarios
  async getForecastScenarios() {
    try {
      const data = await this.fetchWithRetry(
        `${API_BASE_URL}/forecast-scenarios`,
        { method: 'POST' }
      );
      return data;
    } catch (error) {
      console.error('Error fetching forecast scenarios:', error);
      return null;
    }
  }

  // 6. District Priorities
  async getDistrictPriorities() {
    try {
      const data = await this.fetchWithRetry(
        `${API_BASE_URL}/district-priorities`,
        { method: 'POST' }
      );
      return data;
    } catch (error) {
      console.error('Error fetching district priorities:', error);
      return null;
    }
  }
}

export default new ApiService();
