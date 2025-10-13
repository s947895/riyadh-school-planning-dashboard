import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polygon } from 'react-leaflet';
import { Layers, AlertCircle, MapPin, Info, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import AIInsightsPanel from '../shared/AIInsightsPanel';
import api from '../../services/api';

const MapTab = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capacityData, setCapacityData] = useState(null);
  const [optimalLocations, setOptimalLocations] = useState(null);
  const [travelTimeData, setTravelTimeData] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [mapLayer, setMapLayer] = useState('schools');
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [capacity, optimal, travelTime, districts] = await Promise.all([
        api.getCapacityAnalysis(),
        api.getOptimalLocations(),
        api.getTravelTimeHeatmap(),
        api.getDistrictPriorities()
      ]);
      
      console.log('=== MAP TAB DATA ANALYSIS ===');
      console.log('Capacity Summary:', capacity?.summary);
      console.log('Schools Returned:', capacity?.overcapacity_schools?.length);
      console.log('Expected Overcapacity Schools:', capacity?.summary?.overcapacity_schools);
      console.log('Total Schools in System:', capacity?.summary?.total_schools);
      console.log('Optimal Locations:', optimal?.optimal_locations?.length);
      console.log('District Priorities:', districts?.district_priorities?.length);
      
      setCapacityData(capacity);
      setOptimalLocations(optimal);
      setTravelTimeData(travelTime);
      setDistrictData(districts);
    } catch (error) {
      console.error('Error loading map data:', error);
      setError('Failed to load map data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateRiyadhCoordinates = (index) => {
    const centerLat = 24.7136;
    const centerLon = 46.6753;
    const spread = 0.15;
    const angle = (index * 137.5) % 360;
    const radius = Math.sqrt((index + 1) / 100) * spread;
    
    return {
      lat: centerLat + radius * Math.cos(angle * Math.PI / 180),
      lon: centerLon + radius * Math.sin(angle * Math.PI / 180)
    };
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

  let schools = capacityData?.overcapacity_schools || [];
  const summary = capacityData?.summary || {};
  
  // Add coordinates if missing
  schools = schools.map((school, index) => {
    let lat = school.lat || school.latitude;
    let lon = school.lon || school.longitude;
    
    if (!lat || !lon) {
      const generated = generateRiyadhCoordinates(index);
      return { ...school, lat: generated.lat, lon: generated.lon, coordinatesGenerated: true };
    }
    
    return { ...school, lat, lon };
  });

  const optimalLocs = optimalLocations?.optimal_locations || [];
  const heatmapData = travelTimeData?.heatmap_data || [];
  const districtPriorities = districtData?.district_priorities || [];

  // Get district context for a location
  const getDistrictContext = (districtName) => {
    return districtPriorities.find(d => d.district === districtName);
  };

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

  const hasRealCoordinates = schools.some(s => !s.coordinatesGenerated);
  const totalSchools = summary.total_schools || 0;
  const expectedOvercapacity = summary.overcapacity_schools || 0;
  const actualSchoolsShown = schools.length;

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
            <option value="schools">Overcapacity Schools ({actualSchoolsShown})</option>
            <option value="optimal">Optimal New Locations ({optimalLocs.length})</option>
            <option value="heatmap">Travel Time Heatmap ({heatmapData.length})</option>
            <option value="districts">District Priorities ({districtPriorities.length})</option>
          </select>
        </div>
      </div>

      {/* Data Quality Warning */}
      {actualSchoolsShown < expectedOvercapacity && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-1">
                Data Incomplete: Showing {actualSchoolsShown} of {expectedOvercapacity} Overcapacity Schools
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                The system has {totalSchools} total schools, with {expectedOvercapacity} overcapacity schools, 
                but the API is only returning {actualSchoolsShown} schools with location data. 
                Please check your n8n workflow to return complete data.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasRealCoordinates && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <MapPin className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-1">
                Demo Mode: Using Generated Coordinates
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                School locations are distributed around Riyadh for visualization. Add real GPS coordinates to your data for accurate positioning.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {mapLayer === 'schools' && `Showing ${actualSchoolsShown} overcapacity schools out of ${totalSchools} total schools. Click any marker for details.`}
          {mapLayer === 'optimal' && `Showing ${optimalLocs.length} recommended locations for new schools. Click for validation metrics.`}
          {mapLayer === 'heatmap' && `Showing ${heatmapData.length} zones color-coded by travel time accessibility.`}
          {mapLayer === 'districts' && `Showing ${districtPriorities.length} districts with investment priorities. Click to see rationale.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
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

            {/* School Locations Layer */}
            {mapLayer === 'schools' && schools.map((school, index) => {
              const lat = school.lat;
              const lon = school.lon;
              
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
                    <div className="text-sm min-w-[250px]">
                      <h3 className="font-bold mb-2 text-base">{school.name || `School ${index + 1}`}</h3>
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

            {/* Optimal New School Locations Layer */}
            {mapLayer === 'optimal' && optimalLocs.map((location, index) => {
              const lat = location.lat || location.latitude;
              const lon = location.lon || location.longitude;
              
              if (!lat || !lon) return null;

              const districtContext = getDistrictContext(location.district);

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
                  eventHandlers={{
                    click: () => setSelectedDistrict(districtContext)
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[280px]">
                      <h3 className="font-bold mb-2 text-base">📍 Proposed Location #{index + 1}</h3>
                      
                      <div className="mb-3 p-2 bg-purple-50 rounded">
                        <p className="font-semibold text-purple-900">{location.district}</p>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Priority Score:</span>
                          <span className="font-semibold">{location.priority_score?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Coverage Score:</span>
                          <span className="font-semibold">{location.coverage_score?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Students to Serve:</span>
                          <span className="font-semibold text-blue-600">{location.students_to_serve?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>

                      {districtContext && (
                        <>
                          <hr className="my-2" />
                          <div className="mt-2">
                            <p className="font-semibold text-xs text-gray-700 mb-1">District Context:</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Current Deficit:</span>
                                <span className="text-red-600 font-semibold">
                                  {districtContext.metrics?.total_current_deficit?.toLocaleString() || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>2030 Forecast Gap:</span>
                                <span className="text-orange-600 font-semibold">
                                  {districtContext.metrics?.total_forecast_gap_2030?.toLocaleString() || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Travel Time:</span>
                                <span className="font-semibold">
                                  {districtContext.metrics?.avg_travel_time_minutes?.toFixed(1) || 'N/A'} min
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Travel Time Heatmap Layer */}
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
                      <h3 className="font-bold mb-2">{point.district || `Zone ${index + 1}`}</h3>
                      <p><strong>Avg Travel Time:</strong> {travelTime.toFixed(1)} min</p>
                      <p><strong>Students Affected:</strong> {point.students_affected?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </Popup>
                </Circle>
              );
            })}

            {/* District Priorities Layer */}
            {mapLayer === 'districts' && districtPriorities.slice(0, 6).map((district, index) => {
              // For demo, place districts around Riyadh
              const coords = generateRiyadhCoordinates(index * 3);
              const tierColor = 
                district.priority_tier === 'HIGH' ? '#f59e0b' :
                district.priority_tier === 'CRITICAL' ? '#ef4444' :
                district.priority_tier === 'MEDIUM' ? '#eab308' : '#10b981';

              return (
                <CircleMarker
                  key={`district-${index}`}
                  center={[coords.lat, coords.lon]}
                  radius={15}
                  pathOptions={{
                    color: tierColor,
                    fillColor: tierColor,
                    fillOpacity: 0.4,
                    weight: 3
                  }}
                  eventHandlers={{
                    click: () => setSelectedDistrict(district)
                  }}
                >
                  <Popup maxWidth={350}>
                    <div className="text-sm">
                      <h3 className="font-bold mb-2 text-base">{district.district}</h3>
                      <span className={`
                        inline-block px-2 py-1 rounded text-xs font-semibold mb-2
                        ${district.priority_tier === 'HIGH' ? 'bg-orange-100 text-orange-800' : ''}
                        ${district.priority_tier === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {district.priority_tier} Priority
                      </span>
                      <p className="mt-2"><strong>Priority Score:</strong> {district.priority_score?.toFixed(1)}</p>
                      <p><strong>Current Deficit:</strong> <span className="text-red-600">{district.metrics?.total_current_deficit?.toLocaleString()}</span></p>
                      <p><strong>2030 Gap:</strong> <span className="text-orange-600">{district.metrics?.total_forecast_gap_2030?.toLocaleString()}</span></p>
                      <p className="text-xs text-gray-500 mt-2 italic">Click marker to see full rationale →</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Side Panel - District Context */}
        <div className="lg:col-span-1">
          {selectedDistrict ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {selectedDistrict.district}
                </h3>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`
                  px-3 py-1 rounded-full text-xs font-semibold
                  ${selectedDistrict.priority_tier === 'HIGH' ? 'bg-orange-100 text-orange-800' : ''}
                  ${selectedDistrict.priority_tier === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {selectedDistrict.priority_tier} Priority
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Score: {selectedDistrict.priority_score?.toFixed(1)}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Key Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">Overcapacity Schools</p>
                      <p className="font-bold text-lg">{selectedDistrict.metrics?.num_overcapacity_schools || 0}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">Current Deficit</p>
                      <p className="font-bold text-lg text-red-600">{selectedDistrict.metrics?.total_current_deficit?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">2030 Gap</p>
                      <p className="font-bold text-lg text-orange-600">{selectedDistrict.metrics?.total_forecast_gap_2030?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">Population</p>
                      <p className="font-bold text-lg">{selectedDistrict.metrics?.population?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                {selectedDistrict.investment_rationale && selectedDistrict.investment_rationale.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <TrendingUp size={14} className="mr-1" />
                      Investment Rationale
                    </h4>
                    <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                      {selectedDistrict.investment_rationale.map((reason, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
              <Info className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click on a marker to see detailed investment rationale and district context
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
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
          {mapLayer === 'optimal' && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Recommended Location</span>
            </div>
          )}
          {mapLayer === 'districts' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Critical Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">High Priority</span>
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
