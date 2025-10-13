import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet';
import { Layers, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const MapTab = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capacityData, setCapacityData] = useState(null);
  const [optimalLocations, setOptimalLocations] = useState(null);
  const [travelTimeData, setTravelTimeData] = useState(null);
  const [mapLayer, setMapLayer] = useState('schools');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [capacity, optimal, travelTime] = await Promise.all([
        api.getCapacityAnalysis(),
        api.getOptimalLocations(),
        api.getTravelTimeHeatmap()
      ]);
      
      console.log('Capacity Data:', capacity);
      console.log('Optimal Locations:', optimal);
      console.log('Travel Time Data:', travelTime);
      
      setCapacityData(capacity);
      setOptimalLocations(optimal);
      setTravelTimeData(travelTime);
    } catch (error) {
      console.error('Error loading map data:', error);
      setError('Failed to load map data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading map data..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="text-red-600 dark:text-red-400" size={48} />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const schools = capacityData?.overcapacity_schools || [];
  const optimalLocs = optimalLocations?.optimal_locations || optimalLocations?.results?.optimal_locations || [];
  const heatmapData = travelTimeData?.heatmap_data || travelTimeData?.results?.heatmap_data || [];

  const riyadhCenter = [24.7136, 46.6753];

  const getStatusColor = (utilization) => {
    if (utilization >= 120) return '#ef4444';
    if (utilization >= 100) return '#f59e0b';
    if (utilization >= 90) return '#eab308';
    return '#10b981';
  };

  const getStatus = (utilization) => {
    if (utilization >= 120) return 'Critical Overcapacity';
    if (utilization >= 100) return 'Over Capacity';
    if (utilization >= 90) return 'Near Capacity';
    return 'Acceptable';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Interactive Map
        </h2>
        
        <div className="flex items-center space-x-2">
          <Layers className="text-gray-600 dark:text-gray-400" size={20} />
          <select
            value={mapLayer}
            onChange={(e) => setMapLayer(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="schools">School Locations ({schools.length})</option>
            <option value="optimal">Optimal New Locations ({optimalLocs.length})</option>
            <option value="heatmap">Travel Time Heatmap ({heatmapData.length})</option>
          </select>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {mapLayer === 'schools' && `Showing ${schools.length} overcapacity schools. Click any marker for details.`}
          {mapLayer === 'optimal' && `Showing ${optimalLocs.length} recommended locations for new schools.`}
          {mapLayer === 'heatmap' && `Showing ${heatmapData.length} zones color-coded by travel time accessibility.`}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
        <MapContainer
          center={riyadhCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {mapLayer === 'schools' && schools.map((school, index) => {
            const lat = school.lat || school.latitude;
            const lon = school.lon || school.longitude;
            
            if (!lat || !lon) return null;

            const utilization = school.utilization || 0;
            const color = getStatusColor(utilization);
            const status = getStatus(utilization);

            return (
              <CircleMarker
                key={`school-${index}`}
                center={[lat, lon]}
                radius={8}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.7,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <h3 className="font-bold mb-2 text-base">{school.name || school.school_name || 'Unknown School'}</h3>
                    <div className="space-y-1">
                      <p><strong>District:</strong> {school.district || 'N/A'}</p>
                      <p><strong>Type:</strong> {school.type || 'N/A'}</p>
                      <p><strong>Gender:</strong> {school.gender || 'N/A'}</p>
                      <p><strong>Enrollment:</strong> {school.enrollment?.toLocaleString() || 'N/A'}</p>
                      <p><strong>Capacity:</strong> {school.capacity?.toLocaleString() || 'N/A'}</p>
                      <p><strong>Utilization:</strong> <span style={{ color }}>{utilization.toFixed(1)}%</span></p>
                      <p><strong>Status:</strong> <span style={{ color }}>{status}</span></p>
                      {school.deficit > 0 && (
                        <p className="text-red-600 font-semibold"><strong>Deficit:</strong> {school.deficit}</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {mapLayer === 'optimal' && optimalLocs.map((location, index) => {
            const lat = location.lat || location.latitude;
            const lon = location.lon || location.longitude;
            
            if (!lat || !lon) return null;

            return (
              <CircleMarker
                key={`optimal-${index}`}
                center={[lat, lon]}
                radius={10}
                pathOptions={{
                  color: '#8b5cf6',
                  fillColor: '#8b5cf6',
                  fillOpacity: 0.6,
                  weight: 3
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <h3 className="font-bold mb-2 text-base">📍 Proposed Location #{index + 1}</h3>
                    <div className="space-y-1">
                      <p><strong>District:</strong> {location.district || 'N/A'}</p>
                      <p><strong>Priority Score:</strong> {location.priority_score?.toFixed(2) || 'N/A'}</p>
                      <p><strong>Coverage Score:</strong> {location.coverage_score?.toFixed(2) || 'N/A'}</p>
                      <p><strong>Students to Serve:</strong> {location.students_to_serve?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {mapLayer === 'heatmap' && heatmapData.map((point, index) => {
            const lat = point.lat || point.latitude;
            const lon = point.lon || point.longitude;
            
            if (!lat || !lon) return null;

            const travelTime = point.avg_travel_time || point.travel_time || 0;
            const color = travelTime > 30 ? '#ef4444' : travelTime > 20 ? '#f59e0b' : '#10b981';

            return (
              <Circle
                key={`heatmap-${index}`}
                center={[lat, lon]}
                radius={500}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.3,
                  weight: 1
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold mb-2">Zone {index + 1}</h3>
                    <p><strong>Avg Travel Time:</strong> {travelTime.toFixed(1)} min</p>
                    <p><strong>Students Affected:</strong> {point.students_affected?.toLocaleString() || 'N/A'}</p>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mapLayer === 'schools' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Critical (&gt;120%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Over Capacity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Near Capacity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Acceptable</span>
              </div>
            </>
          )}
        </div>
      </div>

      {mapLayer === 'optimal' && optimalLocations?.ai_insights && (
        <AIInsightsPanel insights={optimalLocations.ai_insights} title="AI Location Analysis" />
      )}
      {mapLayer === 'heatmap' && travelTimeData?.ai_insights && (
        <AIInsightsPanel insights={travelTimeData.ai_insights} title="AI Travel Time Analysis" />
      )}
    </div>
  );
};

export default MapTab;
