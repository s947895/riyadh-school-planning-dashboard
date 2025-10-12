import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Layers, Navigation } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

// Fix for default marker icons in Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapTab = () => {
  const [loading, setLoading] = useState(true);
  const [capacityData, setCapacityData] = useState(null);
  const [optimalLocations, setOptimalLocations] = useState(null);
  const [travelTimeData, setTravelTimeData] = useState(null);
  const [mapLayer, setMapLayer] = useState('schools'); // 'schools', 'optimal', 'heatmap'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [capacity, optimal, travelTime] = await Promise.all([
        api.getCapacityAnalysis(),
        api.getOptimalLocations(),
        api.getTravelTimeHeatmap()
      ]);
      setCapacityData(capacity);
      setOptimalLocations(optimal);
      setTravelTimeData(travelTime);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading map data..." />;
  }

  const schools = capacityData?.results?.schools || [];
  const optimalLocs = optimalLocations?.results?.optimal_locations || [];
  const heatmapData = travelTimeData?.results?.heatmap_data || [];

  // Riyadh center coordinates
  const riyadhCenter = [24.7136, 46.6753];

  // Get marker color based on status
  const getMarkerColor = (status) => {
    switch (status) {
      case 'Over Capacity': return '#ef4444'; // red
      case 'Near Capacity': return '#f59e0b'; // orange
      case 'Acceptable': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Interactive Map
        </h2>
        
        {/* Layer Controls */}
        <div className="flex items-center space-x-2">
          <Layers className="text-gray-600 dark:text-gray-400" size={20} />
          <select
            value={mapLayer}
            onChange={(e) => setMapLayer(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="schools">School Locations</option>
            <option value="optimal">Optimal New Locations</option>
            <option value="heatmap">Travel Time Heatmap</option>
          </select>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
        <MapContainer
          center={riyadhCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* School Locations Layer */}
          {mapLayer === 'schools' && schools.map((school, index) => (
            school.latitude && school.longitude && (
              <Circle
                key={`school-${index}`}
                center={[school.latitude, school.longitude]}
                radius={300}
                pathOptions={{
                  color: getMarkerColor(school.status),
                  fillColor: getMarkerColor(school.status),
                  fillOpacity: 0.4
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold mb-1">{school.school_name}</h3>
                    <p><strong>District:</strong> {school.district}</p>
                    <p><strong>Students:</strong> {school.current_students}</p>
                    <p><strong>Capacity:</strong> {school.capacity}</p>
                    <p><strong>Status:</strong> <span style={{ color: getMarkerColor(school.status) }}>{school.status}</span></p>
                    {school.deficit > 0 && (
                      <p className="text-red-600"><strong>Deficit:</strong> {school.deficit}</p>
                    )}
                  </div>
                </Popup>
              </Circle>
            )
          ))}

          {/* Optimal New School Locations Layer */}
          {mapLayer === 'optimal' && optimalLocs.map((location, index) => (
            location.latitude && location.longitude && (
              <Marker
                key={`optimal-${index}`}
                position={[location.latitude, location.longitude]}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold mb-1">Proposed Location #{index + 1}</h3>
                    <p><strong>District:</strong> {location.district}</p>
                    <p><strong>Coverage Score:</strong> {location.coverage_score?.toFixed(2)}</p>
                    <p><strong>Demand Score:</strong> {location.demand_score?.toFixed(2)}</p>
                    <p><strong>Students to Serve:</strong> {location.students_to_serve}</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* Travel Time Heatmap Layer */}
          {mapLayer === 'heatmap' && heatmapData.map((point, index) => (
            point.latitude && point.longitude && (
              <Circle
                key={`heatmap-${index}`}
                center={[point.latitude, point.longitude]}
                radius={500}
                pathOptions={{
                  color: point.avg_travel_time > 30 ? '#ef4444' : point.avg_travel_time > 20 ? '#f59e0b' : '#10b981',
                  fillColor: point.avg_travel_time > 30 ? '#ef4444' : point.avg_travel_time > 20 ? '#f59e0b' : '#10b981',
                  fillOpacity: 0.3
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold mb-1">Zone {index + 1}</h3>
                    <p><strong>Avg Travel Time:</strong> {point.avg_travel_time?.toFixed(1)} min</p>
                    <p><strong>Students Affected:</strong> {point.students_affected}</p>
                  </div>
                </Popup>
              </Circle>
            )
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mapLayer === 'schools' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Over Capacity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Near Capacity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Acceptable</span>
              </div>
            </>
          )}
          {mapLayer === 'heatmap' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">&lt; 20 min</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">20-30 min</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">&gt; 30 min</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Insights */}
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
