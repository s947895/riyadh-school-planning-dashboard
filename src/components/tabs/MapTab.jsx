import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Filter, Eye, EyeOff } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icon for optimal locations
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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const schoolsLayerRef = useRef(null);
  const optimalLayerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  
  const [allSchools, setAllSchools] = useState([]);
  const [optimalLocations, setOptimalLocations] = useState([]);
  const [travelTimeData, setTravelTimeData] = useState([]);
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

  // Fetch all data
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

        // Use all schools if available, otherwise use overcapacity schools
        setAllSchools(capacity.all_schools || capacity.overcapacity_schools || []);
        setOptimalLocations(optimal.recommendations || []);
        setTravelTimeData(travel.heatmap_data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize map - runs after loading is complete
  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return;

    const riyadhCenter = [24.7136, 46.6753];
    const map = L.map(mapRef.current).setView(riyadhCenter, 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Create layer groups
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

  // Helper function to extract coordinates
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
      if (lat >= 24 && lat <= 25 && lng >= 46 && lng <= 47) {
        return { lat, lng };
      }
    }

    return null;
  };

  // Update markers when data, filters, or visibility changes
  useEffect(() => {
    if (!schoolsLayerRef.current || !optimalLayerRef.current || !heatmapLayerRef.current || loading) return;

    // Clear all layers
    schoolsLayerRef.current.clearLayers();
    optimalLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    // 1. Add district heatmap (bottom layer)
    if (showHeatmap && travelTimeData.length > 0) {
      const districtGroups = {};
      
      travelTimeData.forEach((point) => {
        const district = point.from_district || point.district_name;
        if (!districtGroups[district]) {
          districtGroups[district] = {
            points: [],
            avgTravelTime: 0
          };
        }
        districtGroups[district].points.push(point);
      });

      Object.entries(districtGroups).forEach(([district, data]) => {
        const avgTime = data.points.reduce((sum, p) => sum + parseFloat(p.avg_travel_time_minutes || 0), 0) / data.points.length;
        
        // Get district center (use first point as approximation)
        const firstPoint = data.points[0];
        const coords = extractCoordinates(firstPoint);
        
        if (coords) {
          let color, opacity;
          if (avgTime > 30) {
            color = '#ef4444';
            opacity = 0.25;
          } else if (avgTime > 20) {
            color = '#f97316';
            opacity = 0.2;
          } else {
            color = '#22c55e';
            opacity = 0.15;
          }

          // Create a circle to represent district
          const circle = L.circle([coords.lat, coords.lng], {
            radius: 3000, // 3km radius
            fillColor: color,
            fillOpacity: opacity,
            color: color,
            weight: 1,
            opacity: 0.4
          });

          circle.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
              <strong style="font-size: 14px; color: #1f2937;">${district}</strong><br>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <strong>Avg Travel Time:</strong> ${avgTime.toFixed(1)} min<br>
                <strong>Status:</strong> ${avgTime > 30 ? '🔴 High' : avgTime > 20 ? '🟠 Medium' : '🟢 Good'}
              </div>
            </div>
          `);

          circle.addTo(heatmapLayerRef.current);
        }
      });
    }

    // 2. Add school markers
    if (showSchools && allSchools.length > 0) {
      let addedSchools = 0;
      
      allSchools.forEach((school) => {
        const coords = extractCoordinates(school);
        if (!coords) return;

        const utilization = parseFloat(school.utilization || school.utilization_rate || 0);
        const schoolType = school.type || school.school_type || '';
        const gender = school.gender || '';

        // Apply filters
        if (utilization < filters.utilizationMin || utilization > filters.utilizationMax) return;
        if (filters.schoolType !== 'all' && schoolType !== filters.schoolType) return;
        if (filters.gender !== 'all' && gender !== filters.gender) return;

        // Category filters
        if (utilization > 120 && !filters.showCritical) return;
        if (utilization > 100 && utilization <= 120 && !filters.showOverCapacity) return;
        if (utilization > 85 && utilization <= 100 && !filters.showNearCapacity) return;
        if (utilization <= 85 && !filters.showAcceptable) return;

        // Determine color and size
        let color, radius;
        if (utilization > 120) {
          color = '#dc2626';
          radius = 10;
        } else if (utilization > 100) {
          color = '#f97316';
          radius = 9;
        } else if (utilization > 85) {
          color = '#eab308';
          radius = 8;
        } else {
          color = '#22c55e';
          radius = 7;
        }

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        const name = school.name || school.school_name || 'Unknown';
        const district = school.district || school.district_name || 'N/A';
        const capacity = school.capacity || 'N/A';
        const enrollment = school.enrollment || school.current_enrollment || 'N/A';
        const gap = enrollment - capacity;

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px;">
            <strong style="font-size: 15px; color: #1f2937;">${name}</strong><br>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                <strong>📍 District:</strong> <span>${district}</span>
                <strong>🏫 Type:</strong> <span>${schoolType}</span>
                <strong>👥 Gender:</strong> <span>${gender}</span>
                <strong>📊 Capacity:</strong> <span>${capacity}</span>
                <strong>👨‍🎓 Enrolled:</strong> <span>${enrollment}</span>
                <strong>📈 Utilization:</strong> <span style="color: ${color}; font-weight: bold;">${utilization.toFixed(1)}%</span>
                <strong>⚠️ Gap:</strong> <span style="color: ${gap > 0 ? '#dc2626' : '#22c55e'}; font-weight: bold;">${gap > 0 ? '+' : ''}${gap}</span>
              </div>
            </div>
          </div>
        `);

        marker.addTo(schoolsLayerRef.current);
        addedSchools++;
      });

      console.log(`Added ${addedSchools} school markers`);
    }

    // 3. Add optimal location markers (top layer)
    if (showOptimal && optimalLocations.length > 0) {
      let addedOptimal = 0;

      optimalLocations.forEach((location) => {
        const coords = extractCoordinates(location);
        if (!coords) return;

        const marker = L.marker([coords.lat, coords.lng], {
          icon: createStarIcon('#9333ea')
        });

        const schoolType = location.school_type || 'Elementary';
        const gender = location.gender || 'Boys';
        const maxTravel = location.max_acceptable_travel_time_from_district_center || 'N/A';
        const methodology = location.methodology || 'K-means clustering';

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 220px;">
            <strong style="font-size: 15px; color: #9333ea;">✨ Recommended New School</strong><br>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
                <strong>🏫 Type:</strong> <span>${schoolType}</span>
                <strong>👥 Gender:</strong> <span>${gender}</span>
                <strong>⏱️ Max Travel:</strong> <span>${maxTravel} min</span>
                <strong>🧮 Method:</strong> <span>${methodology}</span>
                <strong>📍 Location:</strong> <span>${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}</span>
              </div>
              <div style="margin-top: 8px; padding: 8px; background: #f3e8ff; border-radius: 4px; font-size: 12px;">
                <strong>💡 Impact:</strong> Reduces overcrowding in nearby schools and improves accessibility
              </div>
            </div>
          </div>
        `);

        marker.addTo(optimalLayerRef.current);
        addedOptimal++;
      });

      console.log(`Added ${addedOptimal} optimal location markers`);
    }

  }, [allSchools, optimalLocations, travelTimeData, loading, showSchools, showOptimal, showHeatmap, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Layer toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowSchools(!showSchools)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showSchools
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showSchools ? <Eye size={16} /> : <EyeOff size={16} />}
              Schools ({allSchools.length})
            </button>
            <button
              onClick={() => setShowOptimal(!showOptimal)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showOptimal
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showOptimal ? <Eye size={16} /> : <EyeOff size={16} />}
              Optimal Locations ({optimalLocations.length})
            </button>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showHeatmap
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showHeatmap ? <Eye size={16} /> : <EyeOff size={16} />}
              Travel Time Heatmap
            </button>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Filter size={16} />
            Filters
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Utilization range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Utilization Range: {filters.utilizationMin}% - {filters.utilizationMax}%
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={filters.utilizationMin}
                  onChange={(e) => handleFilterChange('utilizationMin', parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={filters.utilizationMax}
                  onChange={(e) => handleFilterChange('utilizationMax', parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
            </div>

            {/* School type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                School Type
              </label>
              <select
                value={filters.schoolType}
                onChange={(e) => handleFilterChange('schoolType', e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
              >
                <option value="all">All Types</option>
                <option value="Elementary">Elementary</option>
                <option value="Intermediate">Intermediate</option>
                <option value="High">High School</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
              >
                <option value="all">All</option>
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
              </select>
            </div>

            {/* Category toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Show Categories
              </label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showCritical}
                    onChange={(e) => handleFilterChange('showCritical', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-red-600">Critical (&gt;120%)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showOverCapacity}
                    onChange={(e) => handleFilterChange('showOverCapacity', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-orange-600">Over Capacity (100-120%)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showNearCapacity}
                    onChange={(e) => handleFilterChange('showNearCapacity', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-yellow-600">Near Capacity (85-100%)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showAcceptable}
                    onChange={(e) => handleFilterChange('showAcceptable', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-green-600">Acceptable (&lt;85%)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Riyadh Schools - Comprehensive View
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Interactive map showing all schools, recommended locations, and travel time analysis. Click markers for details.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div 
            ref={mapRef} 
            style={{ height: '700px', width: '100%' }}
            className="rounded-lg border border-gray-200 dark:border-gray-700"
          />
          {loading && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: '0.5rem',
              zIndex: 1000 
            }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading map data...</p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">School Status</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-red-600"></div>
                    <span className="text-gray-700 dark:text-gray-300">Critical (&gt;120%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">Over Capacity (100-120%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">Near Capacity (85-100%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">Acceptable (&lt;85%)</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Optimal Locations</p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-purple-600 transform rotate-45"></div>
                  <span className="text-gray-700 dark:text-gray-300">Recommended New School</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Travel Time (Districts)</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-500 opacity-30"></div>
                    <span className="text-gray-700 dark:text-gray-300">&lt; 20 min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-orange-500 opacity-30"></div>
                    <span className="text-gray-700 dark:text-gray-300">20-30 min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-red-500 opacity-30"></div>
                    <span className="text-gray-700 dark:text-gray-300">&gt; 30 min</span>
                  </div>
                </div>
              </div>
            </div>
      </div>
    </div>
  );
};

export default MapTab;
