/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Filter, Eye, Edit3, RotateCcw, Info } from 'lucide-react';
import AIInsightsPanel from '../shared/AIInsightsPanel';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createStarIcon = (color) => {
  return L.divIcon({
    className: 'custom-star-icon',
    html: `<div style="width: 30px; height: 30px; background-color: ${color}; border: 3px solid white; border-radius: 4px; transform: rotate(45deg); box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const MapTab = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const schoolsLayerRef = useRef(null);
  const optimalLayerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  
  const [allSchools, setAllSchools] = useState([]);
  const [optimalLocations, setOptimalLocations] = useState([]);
  const [travelTimeData, setTravelTimeData] = useState([]);
  const [capacityApiData, setCapacityApiData] = useState(null);
  const [optimalApiData, setOptimalApiData] = useState(null);
  const [travelApiData, setTravelApiData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showSchools, setShowSchools] = useState(true);
  const [showOptimal, setShowOptimal] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const [filters, setFilters] = useState({
    utilizationMin: 0,
    utilizationMax: 200,
    schoolType: 'all',
    gender: 'all',
    showCritical: true,
    showOverCapacity: true,
    showNearCapacity: true,
    showAcceptable: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  const [whatIfMode, setWhatIfMode] = useState(false);
  const [capacityChanges, setCapacityChanges] = useState({});

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [capacityRes, optimalRes, travelRes] = await Promise.all([
          fetch('https://n8n.hantoush.space/webhook/school-analysis', { method: 'POST' }),
          fetch('https://n8n.hantoush.space/webhook/find-optimal-locations', { method: 'POST' }),
          fetch('https://n8n.hantoush.space/webhook/travel-time-heatmap', { method: 'POST' })
        ]);

        const capacity = await capacityRes.json();
        const optimal = await optimalRes.json();
        const travel = await travelRes.json();

        const schools = capacity.overcapacity_schools || capacity.results?.schools || capacity.schools || [];
        const optimalLocs = optimal.recommendations || optimal.results?.optimal_locations || [];
        const travelData = travel.district_analysis || travel.heatmap_data || travel.results?.heatmap_data || [];

        setAllSchools(schools);
        setOptimalLocations(optimalLocs);
        setTravelTimeData(travelData);
        setCapacityApiData(capacity);
        setOptimalApiData(optimal);
        setTravelApiData(travel);
      } catch (error) {
        console.error('Error loading map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (loading || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([24.7136, 46.6753], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    schoolsLayerRef.current = L.layerGroup().addTo(map);
    optimalLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);

  const extractCoordinates = (item) => {
    const latFields = ['latitude', 'lat', 'Latitude', 'LAT', 'y', 'center_lat'];
    const lngFields = ['longitude', 'lng', 'lon', 'Longitude', 'LON', 'x', 'center_lon'];
    
    let lat = null;
    let lng = null;

    for (const field of latFields) {
      if (item[field] !== undefined && item[field] !== null) {
        lat = parseFloat(item[field]);
        break;
      }
    }

    for (const field of lngFields) {
      if (item[field] !== undefined && item[field] !== null) {
        lng = parseFloat(item[field]);
        break;
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      if (lat >= 23 && lat <= 26 && lng >= 45 && lng <= 48) {
        return { lat, lng };
      }
    }

    return null;
  };

  const getMarkerColor = (school) => {
    const capacity = parseInt(capacityChanges[school.id] || school.capacity || school.design_capacity || 0);
    const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
    const utilization = capacity > 0 ? (enrollment / capacity) * 100 : 0;

    if (utilization >= 120) return '#dc2626';
    if (utilization >= 100) return '#f97316';
    if (utilization >= 85) return '#fbbf24';
    return '#22c55e';
  };

  const getFilteredSchools = () => {
    return allSchools.filter(school => {
      const capacity = parseInt(capacityChanges[school.id] || school.capacity || school.design_capacity || 0);
      const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
      const utilization = capacity > 0 ? (enrollment / capacity) * 100 : 0;

      if (utilization < filters.utilizationMin || utilization > filters.utilizationMax) return false;
      if (filters.schoolType !== 'all' && school.school_type !== filters.schoolType) return false;
      if (filters.gender !== 'all' && school.gender !== filters.gender) return false;
      if (utilization >= 120 && !filters.showCritical) return false;
      if (utilization >= 100 && utilization < 120 && !filters.showOverCapacity) return false;
      if (utilization >= 85 && utilization < 100 && !filters.showNearCapacity) return false;
      if (utilization < 85 && !filters.showAcceptable) return false;

      return true;
    });
  };

  // Update markers
  useEffect(() => {
    if (!schoolsLayerRef.current || !optimalLayerRef.current || !heatmapLayerRef.current || loading) return;

    schoolsLayerRef.current.clearLayers();
    optimalLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    // DISTRICT HEATMAP
    if (showHeatmap && travelTimeData.length > 0) {
      const districtTravelTime = {};
      
      travelTimeData.forEach((point) => {
        const district = point.district || point.from_district || point.district_name || point.name;
        const travelTime = parseFloat(
          point.avg_travel_time_minutes || 
          point.nearest_school_time || 
          point.travel_time || 
          point.time ||
          0
        );

        if (!district) return;
        
        if (!districtTravelTime[district]) {
          districtTravelTime[district] = {
            points: [],
            totalTime: 0,
            count: 0
          };
        }
        
        districtTravelTime[district].points.push(point);
        districtTravelTime[district].totalTime += travelTime;
        districtTravelTime[district].count += 1;
      });

      Object.entries(districtTravelTime).forEach(([district, data]) => {
        if (data.count === 0) return;
        
        const avgTime = data.totalTime / data.count;

        let centerLat = 0;
        let centerLng = 0;
        let validPoints = 0;
        
        data.points.forEach(point => {
          const coords = extractCoordinates(point);
          if (coords) {
            centerLat += coords.lat;
            centerLng += coords.lng;
            validPoints += 1;
          }
        });
        
        if (validPoints === 0) return;
        
        centerLat = centerLat / validPoints;
        centerLng = centerLng / validPoints;
        
        let color;
        let opacity;
        if (avgTime > 20) {
          color = '#ef4444';
          opacity = 0.3;
        } else if (avgTime > 10) {
          color = '#f97316';
          opacity = 0.25;
        } else {
          color = '#22c55e';
          opacity = 0.2;
        }

        const circle = L.circle([centerLat, centerLng], {
          radius: 3000,
          fillColor: color,
          fillOpacity: opacity,
          color: color,
          weight: 2,
          opacity: 0.5
        });

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif;">
            <strong>${district}</strong><br>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Avg Travel Time:</strong> ${avgTime.toFixed(1)} min<br>
              <strong>Status:</strong> ${avgTime > 20 ? '🔴 High' : avgTime > 10 ? '🟠 Medium' : '🟢 Good'}
            </div>
          </div>
        `);

        circle.addTo(heatmapLayerRef.current);
      });
    }

    // OPTIMAL LOCATIONS
    if (showOptimal && optimalLocations.length > 0) {
      optimalLocations.forEach((location) => {
        const coords = extractCoordinates(location);
        if (!coords) return;

        const marker = L.marker([coords.lat, coords.lng], {
          icon: createStarIcon('#9333ea')
        });

        const studentsServed = location.estimated_students_served || 0;
        const recommendedCapacity = location.recommended_capacity || 800;
        const districtsServed = location.districts_served || [];
        const avgDistance = location.avg_distance_km || 0;

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 280px;">
            <div style="background: #9333ea; color: white; padding: 12px; margin: -12px -12px 12px -12px;">
              <strong>📍 Optimal Location ${location.location_id || ''}</strong><br>
              <span style="font-size: 12px;">${location.recommended_district || ''}</span>
            </div>
            
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
              <strong>📊 Impact:</strong><br>
              <div style="margin-top: 6px; font-size: 13px;">
                <strong>• Students:</strong> ${studentsServed.toLocaleString()}<br>
                <strong>• Capacity:</strong> ${recommendedCapacity.toLocaleString()}<br>
                <strong>• Districts:</strong> ${districtsServed.length}<br>
                <strong>• Distance:</strong> ${avgDistance.toFixed(1)} km
              </div>
            </div>
          </div>
        `);

        marker.addTo(optimalLayerRef.current);
      });
    }

    // SCHOOLS
    if (showSchools) {
      const filteredSchools = getFilteredSchools();

      filteredSchools.forEach((school) => {
        const coords = extractCoordinates(school);
        if (!coords) return;

        const originalCapacity = parseInt(school.capacity || school.design_capacity || 0);
        const adjustedCapacity = parseInt(capacityChanges[school.id] || originalCapacity);
        const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
        const utilization = adjustedCapacity > 0 ? ((enrollment / adjustedCapacity) * 100).toFixed(1) : 0;

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: 8,
          fillColor: getMarkerColor(school),
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        const popupDiv = document.createElement('div');
        popupDiv.style.fontFamily = 'Inter, sans-serif';
        popupDiv.style.minWidth = '260px';
        
        popupDiv.innerHTML = `
          <div style="background: ${getMarkerColor(school)}; color: white; padding: 10px; margin: -12px -12px 12px -12px;">
            <strong>${school.school_name || school.name || 'School'}</strong><br>
            <span style="font-size: 11px;">${school.district || school.district_name || ''}</span>
          </div>
          
          ${whatIfMode ? `
            <div style="background: #fef3c7; padding: 8px; margin-bottom: 10px;">
              <strong style="color: #92400e; font-size: 12px;">🔧 What-If Mode</strong>
            </div>
            <div style="margin-bottom: 10px;">
              <label style="font-size: 12px; font-weight: 600;">Adjust Capacity:</label>
              <input 
                type="number" 
                id="capacity-input-${school.id}"
                value="${adjustedCapacity}"
                min="0"
                style="width: 100%; padding: 6px; border: 2px solid #e5e7eb; border-radius: 4px; margin-top: 4px;"
              />
              <button 
                id="update-btn-${school.id}"
                style="margin-top: 6px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;"
              >
                Update Capacity
              </button>
              ${adjustedCapacity !== originalCapacity ? `
                <button 
                  id="reset-btn-${school.id}"
                  style="margin-top: 4px; padding: 4px 8px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;"
                >
                  Reset to ${originalCapacity}
                </button>
              ` : ''}
            </div>
          ` : ''}

          <div style="background: #f9fafb; padding: 8px; border-radius: 6px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
              <div>
                <strong>Capacity:</strong><br>
                <span style="font-size: 14px;">${adjustedCapacity.toLocaleString()}</span>
              </div>
              <div>
                <strong>Enrollment:</strong><br>
                <span style="font-size: 14px;">${enrollment.toLocaleString()}</span>
              </div>
              <div>
                <strong>Utilization:</strong><br>
                <span style="font-size: 14px;">${utilization}%</span>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupDiv);

        if (whatIfMode) {
          marker.on('popupopen', () => {
            const updateBtn = document.getElementById(`update-btn-${school.id}`);
            const resetBtn = document.getElementById(`reset-btn-${school.id}`);
            const input = document.getElementById(`capacity-input-${school.id}`);

            if (updateBtn && input) {
              updateBtn.addEventListener('click', () => {
                const newCapacity = parseInt(input.value);
                if (!isNaN(newCapacity) && newCapacity >= 0) {
                  setCapacityChanges(prev => ({
                    ...prev,
                    [school.id]: newCapacity
                  }));
                }
              });
            }

            if (resetBtn) {
              resetBtn.addEventListener('click', () => {
                setCapacityChanges(prev => {
                  const updated = { ...prev };
                  delete updated[school.id];
                  return updated;
                });
              });
            }
          });
        }

        marker.addTo(schoolsLayerRef.current);
      });
    }
  }, [allSchools, optimalLocations, travelTimeData, showSchools, showOptimal, showHeatmap, filters, whatIfMode, capacityChanges, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0"></div>

        <div className="absolute top-4 right-4 z-10 space-y-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Layers</h3>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSchools}
                onChange={(e) => setShowSchools(e.target.checked)}
                className="w-4 h-4"
              />
              <Eye size={16} className={showSchools ? 'text-blue-600' : 'text-gray-400'} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Schools</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOptimal}
                onChange={(e) => setShowOptimal(e.target.checked)}
                className="w-4 h-4"
              />
              <Eye size={16} className={showOptimal ? 'text-purple-600' : 'text-gray-400'} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Optimal</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="w-4 h-4"
              />
              <Eye size={16} className={showHeatmap ? 'text-green-600' : 'text-gray-400'} />
              <span className="text-sm text-gray-700 dark:text-gray-300">Heatmap</span>
            </label>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whatIfMode}
                onChange={(e) => {
                  setWhatIfMode(e.target.checked);
                  if (!e.target.checked) setCapacityChanges({});
                }}
                className="w-4 h-4"
              />
              <Edit3 size={16} className={whatIfMode ? 'text-orange-600' : 'text-gray-400'} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">What-If</span>
            </label>
            {whatIfMode && Object.keys(capacityChanges).length > 0 && (
              <button
                onClick={() => setCapacityChanges({})}
                className="mt-2 flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <RotateCcw size={12} />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span>
            </div>
            <span className="text-xs text-gray-500">{showFilters ? '▼' : '▶'}</span>
          </button>

          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3 max-w-xs">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                  Utilization: {filters.utilizationMin}%-{filters.utilizationMax}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.utilizationMin}
                  onChange={(e) => setFilters({...filters, utilizationMin: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Type</label>
                <select
                  value={filters.schoolType}
                  onChange={(e) => setFilters({...filters, schoolType: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="all">All</option>
                  <option value="Elementary">Elementary</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="High">High</option>
                </select>
              </div>

              <button
                onClick={() => setFilters({
                  utilizationMin: 0,
                  utilizationMax: 200,
                  schoolType: 'all',
                  gender: 'all',
                  showCritical: true,
                  showOverCapacity: true,
                  showNearCapacity: true,
                  showAcceptable: true,
                })}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-2 px-3 rounded text-sm"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-xl font-bold text-blue-600">{allSchools.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Schools</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-600">{optimalLocations.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Optimal</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{travelTimeData.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Districts</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs">
          <h3 className="font-semibold text-xs text-gray-900 dark:text-white mb-2">Legend</h3>
          
          {showSchools && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Schools</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-gray-700 dark:text-gray-300">Critical (≥120%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Over (100-119%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span className="text-gray-700 dark:text-gray-300">Near (85-99%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">OK (&lt;85%)</span>
                </div>
              </div>
            </div>
          )}

          {showHeatmap && (
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Travel Time</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500 opacity-30"></div>
                  <span className="text-gray-700 dark:text-gray-300">&lt;10 min</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-orange-500 opacity-30"></div>
                  <span className="text-gray-700 dark:text-gray-300">10-20 min</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-500 opacity-30"></div>
                  <span className="text-gray-700 dark:text-gray-300">&gt;20 min</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-96 bg-gray-50 dark:bg-gray-900 p-4 space-y-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">AI Insights</h2>
        
        {optimalApiData?.ai_insights && showOptimal && (
          <div className="mb-4">
            <AIInsightsPanel 
              insights={optimalApiData.ai_insights} 
              title="Location Analysis" 
            />
          </div>
        )}
        
        {travelApiData?.ai_insights && showHeatmap && (
          <div>
            <AIInsightsPanel 
              insights={travelApiData.ai_insights} 
              title="Travel Time Analysis" 
            />
          </div>
        )}

        {!optimalApiData?.ai_insights && !travelApiData?.ai_insights && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>Enable layers to see AI insights</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapTab;












/**





// ============================================
// MapTab.jsx - PART 1 of 3
// To reconstruct: Concatenate Part1 + Part2 + Part3
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Filter, Eye, EyeOff, Edit3, RotateCcw, Info } from 'lucide-react';
import AIInsightsPanel from '../shared/AIInsightsPanel';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for optimal locations (diamond shape)
const createStarIcon = (color) => {
  return L.divIcon({
    className: 'custom-star-icon',
    html: `<div style="
      width: 30px; 
      height: 30px; 
      background-color: ${color}; 
      border: 3px solid white;
      border-radius: 4px;
      transform: rotate(45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const MapTab = () => {
  // Refs for map and layers
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const schoolsLayerRef = useRef(null);
  const optimalLayerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  
  // Data state
  const [allSchools, setAllSchools] = useState([]);
  const [optimalLocations, setOptimalLocations] = useState([]);
  const [travelTimeData, setTravelTimeData] = useState([]);
  const [capacityApiData, setCapacityApiData] = useState(null);
  const [optimalApiData, setOptimalApiData] = useState(null);
  const [travelApiData, setTravelApiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Layer visibility
  const [showSchools, setShowSchools] = useState(true);
  const [showOptimal, setShowOptimal] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    utilizationMin: 0,
    utilizationMax: 200,
    schoolType: 'all',
    gender: 'all',
    showCritical: true,
    showOverCapacity: true,
    showNearCapacity: true,
    showAcceptable: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  // What-if analysis state
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [capacityChanges, setCapacityChanges] = useState({});
  const [districtImpact, setDistrictImpact] = useState({});

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [capacityRes, optimalRes, travelRes] = await Promise.all([
          fetch('https://n8n.hantoush.space/webhook/school-analysis', { method: 'POST' }),
          fetch('https://n8n.hantoush.space/webhook/find-optimal-locations', { method: 'POST' }),
          fetch('https://n8n.hantoush.space/webhook/travel-time-heatmap', { method: 'POST' })
        ]);

        const capacity = await capacityRes.json();
        const optimal = await optimalRes.json();
        const travel = await travelRes.json();

        console.log('Capacity Data:', capacity);
        console.log('Optimal Locations:', optimal);
        console.log('Travel Time Data:', travel);

        // Extract schools from API response
        const schools = capacity.overcapacity_schools || capacity.results?.schools || [];
        const optimalLocs = optimal.recommendations || optimal.results?.optimal_locations || [];
        const travelData = travel.district_analysis || travel.heatmap_data || travel.results?.heatmap_data || [];

        setAllSchools(schools);
        setOptimalLocations(optimalLocs);
        setTravelTimeData(travelData);
        setCapacityApiData(capacity);
        setOptimalApiData(optimal);
        setTravelApiData(travel);
      } catch (error) {
        console.error('Error loading map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (loading || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([24.7136, 46.6753], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    schoolsLayerRef.current = L.layerGroup().addTo(map);
    optimalLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);

  // Helper: Extract coordinates from various field names
  const extractCoordinates = (item) => {
    const latFields = ['latitude', 'lat', 'Latitude', 'LAT', 'y'];
    const lngFields = ['longitude', 'lng', 'lon', 'Longitude', 'LONGITUDE', 'LON', 'x'];
    
    let lat = null;
    let lng = null;

    for (const field of latFields) {
      if (item[field] !== undefined && item[field] !== null) {
        lat = parseFloat(item[field]);
        break;
      }
    }

    for (const field of lngFields) {
      if (item[field] !== undefined && item[field] !== null) {
        lng = parseFloat(item[field]);
        break;
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // Validate coordinates are within Riyadh bounds
      if (lat >= 24 && lat <= 25 && lng >= 46 && lng <= 47) {
        return { lat, lng };
      }
    }

    return null;
  };

  // Helper: Calculate district-level impact for what-if analysis
  const calculateDistrictImpact = () => {
    const districtStats = {};
    
    allSchools.forEach(school => {
      const district = school.district || school.district_name || 'Unknown';
      if (!districtStats[district]) {
        districtStats[district] = {
          totalCapacity: 0,
          totalEnrollment: 0,
          schoolCount: 0,
          overcrowded: 0,
          originalCapacity: 0,
          capacityChange: 0
        };
      }
      
      const originalCapacity = parseInt(school.capacity || school.design_capacity || 0);
      const adjustedCapacity = parseInt(capacityChanges[school.id] || originalCapacity);
      const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
      
      districtStats[district].totalCapacity += adjustedCapacity;
      districtStats[district].totalEnrollment += enrollment;
      districtStats[district].originalCapacity += originalCapacity;
      districtStats[district].capacityChange += (adjustedCapacity - originalCapacity);
      districtStats[district].schoolCount += 1;
      
      if (enrollment > adjustedCapacity) {
        districtStats[district].overcrowded += 1;
      }
    });
    
    // Calculate utilization percentages
    Object.keys(districtStats).forEach(district => {
      const stats = districtStats[district];
      stats.utilization = stats.totalCapacity > 0 
        ? Math.round((stats.totalEnrollment / stats.totalCapacity) * 100) 
        : 0;
      stats.deficit = Math.max(0, stats.totalEnrollment - stats.totalCapacity);
    });
    
    setDistrictImpact(districtStats);
    return districtStats;
  };

  // Recalculate district impact when capacity changes
  useEffect(() => {
    if (whatIfMode) {
      calculateDistrictImpact();
    }
  }, [capacityChanges, whatIfMode, allSchools]);

  // Helper: Get marker color based on utilization
  const getMarkerColor = (school) => {
    const capacity = parseInt(capacityChanges[school.id] || school.capacity || school.design_capacity || 0);
    const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
    const utilization = capacity > 0 ? (enrollment / capacity) * 100 : 0;

    if (utilization >= 120) return '#dc2626'; // Critical red
    if (utilization >= 100) return '#f97316'; // Over capacity orange
    if (utilization >= 85) return '#fbbf24';  // Near capacity yellow
    return '#22c55e';  // Acceptable green
  };

  // Helper: Filter schools based on current filters
  const getFilteredSchools = () => {
    return allSchools.filter(school => {
      const capacity = parseInt(capacityChanges[school.id] || school.capacity || school.design_capacity || 0);
      const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
      const utilization = capacity > 0 ? (enrollment / capacity) * 100 : 0;

      // Utilization filter
      if (utilization < filters.utilizationMin || utilization > filters.utilizationMax) {
        return false;
      }

      // School type filter
      if (filters.schoolType !== 'all' && school.school_type !== filters.schoolType) {
        return false;
      }

      // Gender filter
      if (filters.gender !== 'all' && school.gender !== filters.gender) {
        return false;
      }

      // Category filters
      if (utilization >= 120 && !filters.showCritical) return false;
      if (utilization >= 100 && utilization < 120 && !filters.showOverCapacity) return false;
      if (utilization >= 85 && utilization < 100 && !filters.showNearCapacity) return false;
      if (utilization < 85 && !filters.showAcceptable) return false;

      return true;
    });
  };

// END OF PART 1
// Continue with Part 2 for marker rendering and map updates
// ============================================
// MapTab.jsx - PART 2 of 3
// This is the continuation of Part 1
// ============================================

  // Update markers when data, filters, or visibility changes
  useEffect(() => {
    if (!schoolsLayerRef.current || !optimalLayerRef.current || !heatmapLayerRef.current || loading) return;

    // Clear all layers
    schoolsLayerRef.current.clearLayers();
    optimalLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    const districtStats = whatIfMode ? calculateDistrictImpact() : {};

    // ===== FIX #1: DISTRICT HEATMAP - Show ALL districts =====
    if (showHeatmap && travelTimeData.length > 0) {
      // Group travel time data by district
      const districtTravelTime = {};
      
      travelTimeData.forEach((point) => {
        const district = point.district || point.from_district || point.district_name;
        if (!district) return;
        
        if (!districtTravelTime[district]) {
          districtTravelTime[district] = {
            points: [],
            totalTime: 0,
            count: 0
          };
        }
        
        const travelTime = parseFloat(point.avg_travel_time_minutes || point.nearest_school_time || 0);
        districtTravelTime[district].points.push(point);
        districtTravelTime[district].totalTime += travelTime;
        districtTravelTime[district].count += 1;
      });

      // Create circles for EACH district
      Object.entries(districtTravelTime).forEach(([district, data]) => {
        if (data.count === 0) return;
        
        const avgTime = data.totalTime / data.count;
        
        // Find district center (average of all points or use first point)
        let centerLat = 0, centerLng = 0, validPoints = 0;
        
        data.points.forEach(point => {
          const coords = extractCoordinates(point);
          if (coords) {
            centerLat += coords.lat;
            centerLng += coords.lng;
            validPoints++;
          }
        });
        
        if (validPoints === 0) return;
        
        centerLat = centerLat / validPoints;
        centerLng = centerLng / validPoints;
        
        // Color based on travel time
        let color, opacity;
        if (avgTime > 30) {
          color = '#ef4444'; // Red
          opacity = 0.25;
        } else if (avgTime > 20) {
          color = '#f97316'; // Orange
          opacity = 0.2;
        } else {
          color = '#22c55e'; // Green
          opacity = 0.15;
        }

        const circle = L.circle([centerLat, centerLng], {
          radius: 3000, // 3km radius
          fillColor: color,
          fillOpacity: opacity,
          color: color,
          weight: 1,
          opacity: 0.4
        });

        // Popup with district stats
        const stats = districtStats[district] || {};
        const utilizationInfo = whatIfMode && stats.totalCapacity 
          ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>District Capacity:</strong><br>
              Schools: ${stats.schoolCount}<br>
              Total Capacity: ${stats.totalCapacity.toLocaleString()}<br>
              Total Enrollment: ${stats.totalEnrollment.toLocaleString()}<br>
              Utilization: ${stats.utilization}%<br>
              Deficit: ${stats.deficit.toLocaleString()} students<br>
              ${stats.capacityChange !== 0 ? `<strong style="color: ${stats.capacityChange > 0 ? '#22c55e' : '#ef4444'};">Capacity Change: ${stats.capacityChange > 0 ? '+' : ''}${stats.capacityChange}</strong>` : ''}
            </div>
          `
          : '';

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif;">
            <strong style="font-size: 14px; color: #1f2937;">${district}</strong><br>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Avg Travel Time:</strong> ${avgTime.toFixed(1)} min<br>
              <strong>Status:</strong> ${avgTime > 30 ? '🔴 High' : avgTime > 20 ? '🟠 Medium' : '🟢 Good'}
            </div>
            ${utilizationInfo}
          </div>
        `);

        circle.addTo(heatmapLayerRef.current);
      });
    }

    // ===== FIX #2: OPTIMAL LOCATIONS - Add quantitative impact =====
    if (showOptimal && optimalLocations.length > 0) {
      optimalLocations.forEach((location) => {
        const coords = extractCoordinates(location);
        if (!coords) return;

        const marker = L.marker([coords.lat, coords.lng], {
          icon: createStarIcon('#9333ea')
        });

        // Enhanced popup with quantitative metrics
        const studentsServed = location.estimated_students_served || 0;
        const recommendedCapacity = location.recommended_capacity || 800;
        const districtsServed = location.districts_served || [];
        const avgDistance = location.avg_distance_km || 0;
        const priority = location.priority || 'HIGH';

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 280px;">
            <div style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 12px; margin: -12px -12px 12px -12px; border-radius: 4px 4px 0 0;">
              <strong style="font-size: 16px;">📍 Optimal Location ${location.location_id || ''}</strong><br>
              <span style="font-size: 12px; opacity: 0.9;">${location.recommended_district || 'New School Site'}</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #6b21a8;">School Details:</strong><br>
              <span style="font-size: 13px;">
                ${location.school_type || 'Elementary'} · ${location.gender || 'Boys'}<br>
                Priority: <strong style="color: ${priority === 'HIGH' ? '#dc2626' : '#f97316'};">${priority}</strong>
              </span>
            </div>

            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
              <strong style="color: #1f2937; font-size: 14px;">📊 Quantitative Impact:</strong><br>
              <div style="margin-top: 6px; font-size: 13px; line-height: 1.6;">
                <strong>• Students Served:</strong> ${studentsServed.toLocaleString()} students<br>
                <strong>• Recommended Capacity:</strong> ${recommendedCapacity.toLocaleString()} seats<br>
                <strong>• Expected Utilization:</strong> ~85%<br>
                <strong>• Reduces Overcrowding:</strong> ~${Math.round(studentsServed * 0.3).toLocaleString()} students<br>
                <strong>• Districts Covered:</strong> ${districtsServed.length} districts<br>
                <strong>• Avg Distance:</strong> ${avgDistance.toFixed(1)} km
              </div>
            </div>

            ${districtsServed.length > 0 ? `
              <div style="margin-bottom: 8px;">
                <strong style="color: #1f2937; font-size: 13px;">Serving Districts:</strong><br>
                <span style="font-size: 12px; color: #6b7280;">${districtsServed.join(', ')}</span>
              </div>
            ` : ''}

            ${location.rationale ? `
              <div style="padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #4b5563;">
                <em>${location.rationale}</em>
              </div>
            ` : ''}
          </div>
        `);

        marker.addTo(optimalLayerRef.current);
      });
    }

    // ===== FIX #3: SCHOOLS - Add what-if capability =====
    if (showSchools) {
      const filteredSchools = getFilteredSchools();

      filteredSchools.forEach((school) => {
        const coords = extractCoordinates(school);
        if (!coords) return;

        const originalCapacity = parseInt(school.capacity || school.design_capacity || 0);
        const adjustedCapacity = parseInt(capacityChanges[school.id] || originalCapacity);
        const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
        const utilization = adjustedCapacity > 0 ? ((enrollment / adjustedCapacity) * 100).toFixed(1) : 0;
        const deficit = Math.max(0, enrollment - adjustedCapacity);

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: 8,
          fillColor: getMarkerColor(school),
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        // Create popup content with what-if capability
        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'Inter, sans-serif';
        popupContent.style.minWidth = '260px';
        
        popupContent.innerHTML = `
          <div style="background: linear-gradient(135deg, ${getMarkerColor(school)} 0%, ${getMarkerColor(school)}dd 100%); color: white; padding: 10px; margin: -12px -12px 12px -12px; border-radius: 4px 4px 0 0;">
            <strong style="font-size: 14px;">${school.school_name || school.name || 'School'}</strong><br>
            <span style="font-size: 11px; opacity: 0.9;">${school.district || school.district_name || ''}</span>
          </div>
          
          <div style="margin-bottom: 10px; font-size: 12px;">
            <strong>${school.school_type || 'Elementary'}</strong> · ${school.gender || 'Boys'}
          </div>

          ${whatIfMode ? `
            <div style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 8px; margin-bottom: 10px; border-radius: 4px;">
              <strong style="color: #92400e; font-size: 12px;">🔧 What-If Mode Active</strong>
            </div>
            <div style="margin-bottom: 10px;">
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Adjust Capacity:</label>
              <input 
                type="number" 
                id="capacity-input-${school.id}"
                value="${adjustedCapacity}"
                min="0"
                style="width: 100%; padding: 6px; border: 2px solid #e5e7eb; border-radius: 4px; font-size: 13px;"
              />
              <button 
                id="update-btn-${school.id}"
                style="margin-top: 6px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;"
              >
                Update Capacity
              </button>
              ${adjustedCapacity !== originalCapacity ? `
                <button 
                  id="reset-btn-${school.id}"
                  style="margin-top: 4px; padding: 4px 8px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%;"
                >
                  Reset to Original (${originalCapacity})
                </button>
              ` : ''}
            </div>
          ` : ''}

          <div style="background: #f9fafb; padding: 8px; border-radius: 6px; font-size: 12px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <strong style="color: #6b7280;">Capacity:</strong><br>
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${adjustedCapacity.toLocaleString()}</span>
                ${adjustedCapacity !== originalCapacity ? `<br><span style="color: #3b82f6; font-size: 10px;">(was ${originalCapacity})</span>` : ''}
              </div>
              <div>
                <strong style="color: #6b7280;">Enrollment:</strong><br>
                <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${enrollment.toLocaleString()}</span>
              </div>
              <div>
                <strong style="color: #6b7280;">Utilization:</strong><br>
                <span style="color: ${utilization >= 100 ? '#dc2626' : utilization >= 85 ? '#f97316' : '#22c55e'}; font-size: 14px; font-weight: 600;">${utilization}%</span>
              </div>
              <div>
                <strong style="color: #6b7280;">Deficit:</strong><br>
                <span style="color: ${deficit > 0 ? '#dc2626' : '#22c55e'}; font-size: 14px; font-weight: 600;">${deficit > 0 ? deficit.toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Add event listeners for what-if mode buttons
        if (whatIfMode) {
          marker.on('popupopen', () => {
            const updateBtn = document.getElementById(`update-btn-${school.id}`);
            const resetBtn = document.getElementById(`reset-btn-${school.id}`);
            const input = document.getElementById(`capacity-input-${school.id}`);

            if (updateBtn) {
              updateBtn.addEventListener('click', () => {
                const newCapacity = parseInt(input.value);
                if (!isNaN(newCapacity) && newCapacity >= 0) {
                  setCapacityChanges(prev => ({
                    ...prev,
                    [school.id]: newCapacity
                  }));
                }
              });
            }

            if (resetBtn) {
              resetBtn.addEventListener('click', () => {
                setCapacityChanges(prev => {
                  const updated = { ...prev };
                  delete updated[school.id];
                  return updated;
                });
              });
            }
          });
        }

        marker.addTo(schoolsLayerRef.current);
      });
    }
  }, [allSchools, optimalLocations, travelTimeData, showSchools, showOptimal, showHeatmap, filters, whatIfMode, capacityChanges, loading]);

// END OF PART 2
// Continue with Part 3 for UI components and rendering
// ============================================
// MapTab.jsx - PART 3 of 3
// This is the continuation of Part 2
// Final part with UI rendering
// ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0"></div>

      {/* Control Panel - Top Right */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        {/* Layer Toggles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Map Layers</h3>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSchools}
              onChange={(e) => setShowSchools(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <Eye size={16} className={showSchools ? 'text-blue-600' : 'text-gray-400'} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Schools</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOptimal}
              onChange={(e) => setShowOptimal(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <Eye size={16} className={showOptimal ? 'text-purple-600' : 'text-gray-400'} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Optimal Locations</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <Eye size={16} className={showHeatmap ? 'text-green-600' : 'text-gray-400'} />
            <span className="text-sm text-gray-700 dark:text-gray-300">District Heatmap</span>
          </label>
        </div>

        {/* What-If Analysis Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={whatIfMode}
              onChange={(e) => {
                setWhatIfMode(e.target.checked);
                if (!e.target.checked) {
                  setCapacityChanges({});
                }
              }}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <Edit3 size={16} className={whatIfMode ? 'text-orange-600' : 'text-gray-400'} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">What-If Mode</span>
          </label>
          {whatIfMode && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              <p>Click schools to adjust capacity and see district-level impact</p>
              {Object.keys(capacityChanges).length > 0 && (
                <button
                  onClick={() => setCapacityChanges({})}
                  className="mt-2 flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  <RotateCcw size={12} />
                  <span>Reset All Changes</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span>
          </div>
          <span className="text-xs text-gray-500">{showFilters ? '▼' : '▶'}</span>
        </button>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4 max-w-xs">
            {/* Utilization Range */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                Utilization: {filters.utilizationMin}% - {filters.utilizationMax}%
              </label>
              <div className="flex space-x-2">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.utilizationMin}
                  onChange={(e) => setFilters({...filters, utilizationMin: parseInt(e.target.value)})}
                  className="w-full"
                />
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.utilizationMax}
                  onChange={(e) => setFilters({...filters, utilizationMax: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>

            {/* School Type */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                School Type
              </label>
              <select
                value={filters.schoolType}
                onChange={(e) => setFilters({...filters, schoolType: e.target.value})}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="Elementary">Elementary</option>
                <option value="Intermediate">Intermediate</option>
                <option value="High">High School</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({...filters, gender: e.target.value})}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
              </select>
            </div>

            {/* Category Toggles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                Categories
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.showCritical}
                  onChange={(e) => setFilters({...filters, showCritical: e.target.checked})}
                  className="w-3 h-3"
                />
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-gray-700 dark:text-gray-300">Critical (≥120%)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.showOverCapacity}
                  onChange={(e) => setFilters({...filters, showOverCapacity: e.target.checked})}
                  className="w-3 h-3"
                />
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Over (100-119%)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.showNearCapacity}
                  onChange={(e) => setFilters({...filters, showNearCapacity: e.target.checked})}
                  className="w-3 h-3"
                />
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-gray-700 dark:text-gray-300">Near (85-99%)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.showAcceptable}
                  onChange={(e) => setFilters({...filters, showAcceptable: e.target.checked})}
                  className="w-3 h-3"
                />
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Acceptable (&lt;85%)</span>
              </label>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => setFilters({
                utilizationMin: 0,
                utilizationMax: 200,
                schoolType: 'all',
                gender: 'all',
                showCritical: true,
                showOverCapacity: true,
                showNearCapacity: true,
                showAcceptable: true,
              })}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-3 rounded text-sm transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Legend</h3>
        
        {/* Schools Legend */}
        {showSchools && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Schools (by utilization)</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-gray-700 dark:text-gray-300">Critical (≥120%)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Over Capacity (100-119%)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-gray-700 dark:text-gray-300">Near Capacity (85-99%)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700 dark:text-gray-300">Acceptable (&lt;85%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Optimal Locations Legend */}
        {showOptimal && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Optimal Locations</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-purple-600 transform rotate-45"></div>
              <span className="text-gray-700 dark:text-gray-300">Recommended Site</span>
            </div>
          </div>
        )}

        {/* District Heatmap Legend */}
        {showHeatmap && (
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">District Travel Time</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500 opacity-30"></div>
                <span className="text-gray-700 dark:text-gray-300">&lt;20 min avg</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-orange-500 opacity-30"></div>
                <span className="text-gray-700 dark:text-gray-300">20-30 min avg</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500 opacity-30"></div>
                <span className="text-gray-700 dark:text-gray-300">&gt;30 min avg</span>
              </div>
            </div>
          </div>
        )}

        {/* What-If Impact Summary */}
        {whatIfMode && Object.keys(capacityChanges).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-orange-600" />
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Impact Summary</p>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>{Object.keys(capacityChanges).length}</strong> schools modified</p>
              <p className="text-orange-600">Click districts to see impact</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary - Top Left */}
      <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{allSchools.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Schools</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{optimalLocations.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Optimal Sites</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{Object.keys(districtImpact).length || travelTimeData.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Districts</p>
          </div>
        </div>
      </div>

      {/* AI Insights Panels - Bottom */}
      <div className="absolute bottom-4 right-4 z-10 max-w-md space-y-4">
        {optimalApiData?.ai_insights && showOptimal && (
          <AIInsightsPanel 
            insights={optimalApiData.ai_insights} 
            title="AI Location Analysis" 
          />
        )}
        {travelApiData?.ai_insights && showHeatmap && (
          <AIInsightsPanel 
            insights={travelApiData.ai_insights} 
            title="AI Travel Time Analysis" 
          />
        )}
      </div>
    </div>
  );
};

export default MapTab;

// ============================================
// END OF PART 3
// 
// To use this file:
// 1. Concatenate Part1 + Part2 + Part3
// 2. Save as MapTab.jsx
// 3. Deploy to your React application
// ============================================




*/
