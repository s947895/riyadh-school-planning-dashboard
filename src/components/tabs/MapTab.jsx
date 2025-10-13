// MapTab.jsx - FIXED VERSION
// Addresses: AI panel positioning, what-if travel time recalculation, district color debugging

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Filter, Eye, EyeOff, Edit3, RotateCcw, Info, AlertCircle } from 'lucide-react';
import AIInsightsPanel from '../shared/AIInsightsPanel';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for optimal locations
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

  // What-if analysis
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [capacityChanges, setCapacityChanges] = useState({});
  const [recalculatedTravelTimes, setRecalculatedTravelTimes] = useState({});

  // Debug info
  const [debugInfo, setDebugInfo] = useState('');

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

        console.log('=== API RESPONSES ===');
        console.log('Capacity:', capacity);
        console.log('Optimal:', optimal);
        console.log('Travel:', travel);

        const schools = capacity.overcapacity_schools || capacity.results?.schools || capacity.schools || [];
        const optimalLocs = optimal.recommendations || optimal.results?.optimal_locations || [];
        const travelData = travel.district_analysis || travel.heatmap_data || travel.results?.heatmap_data || [];

        console.log('=== EXTRACTED DATA ===');
        console.log('Schools:', schools.length, schools[0]);
        console.log('Optimal:', optimalLocs.length, optimalLocs[0]);
        console.log('Travel Data:', travelData.length, travelData[0]);

        // Debug travel time data structure
        if (travelData.length > 0) {
          const sample = travelData[0];
          const debugMsg = `Travel Data Sample: ${JSON.stringify(sample, null, 2)}`;
          console.log(debugMsg);
          setDebugInfo(debugMsg);
        }

        setAllSchools(schools);
        setOptimalLocations(optimalLocs);
        setTravelTimeData(travelData);
        setCapacityApiData(capacity);
        setOptimalApiData(optimal);
        setTravelApiData(travel);
      } catch (error) {
        console.error('Error loading map data:', error);
        setDebugInfo(`Error: ${error.message}`);
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

  // Extract coordinates
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

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Recalculate travel times based on capacity changes
  const recalculateTravelTimes = () => {
    if (!whatIfMode || Object.keys(capacityChanges).length === 0) {
      return travelTimeData;
    }

    console.log('=== RECALCULATING TRAVEL TIMES ===');
    
    // Get schools with updated capacities
    const updatedSchools = allSchools.map(school => ({
      ...school,
      capacity: parseInt(capacityChanges[school.id] || school.capacity || school.design_capacity || 0),
      enrollment: parseInt(school.enrollment || school.current_enrollment || 0)
    }));

    // Group schools by district to find available capacity per district
    const districtCapacity = {};
    updatedSchools.forEach(school => {
      const district = school.district || school.district_name;
      const coords = extractCoordinates(school);
      if (!district || !coords) return;

      if (!districtCapacity[district]) {
        districtCapacity[district] = {
          schools: [],
          availableCapacity: 0,
          totalEnrollment: 0
        };
      }

      const availableSeats = Math.max(0, school.capacity - school.enrollment);
      districtCapacity[district].schools.push({
        ...school,
        coords,
        availableSeats
      });
      districtCapacity[district].availableCapacity += availableSeats;
      districtCapacity[district].totalEnrollment += school.enrollment;
    });

    // Calculate new travel times for each district
    const newTravelTimes = {};
    
    Object.entries(districtCapacity).forEach(([district, data]) => {
      // If district has sufficient capacity, travel time is minimal
      if (data.availableCapacity > 0) {
        // Average distance to schools in same district
        const localSchools = data.schools.filter(s => s.availableSeats > 0);
        if (localSchools.length > 0) {
          // Assume 5 min average for local schools with capacity
          newTravelTimes[district] = 5;
          return;
        }
      }

      // Need to find nearest school with capacity in other districts
      let minDistance = Infinity;
      let minTime = Infinity;

      // Get district center (average of school locations)
      const districtSchools = data.schools;
      if (districtSchools.length > 0) {
        const centerLat = districtSchools.reduce((sum, s) => sum + s.coords.lat, 0) / districtSchools.length;
        const centerLon = districtSchools.reduce((sum, s) => sum + s.coords.lng, 0) / districtSchools.length;

        // Check all schools with available capacity
        updatedSchools.forEach(school => {
          const availableSeats = school.capacity - school.enrollment;
          if (availableSeats > 0) {
            const coords = extractCoordinates(school);
            if (coords) {
              const distance = calculateDistance(centerLat, centerLon, coords.lat, coords.lng);
              if (distance < minDistance) {
                minDistance = distance;
                // Estimate: 3 min per km in urban area
                minTime = Math.max(5, distance * 3);
              }
            }
          }
        });
      }

      newTravelTimes[district] = minTime === Infinity ? 30 : Math.round(minTime);
    });

    console.log('New Travel Times:', newTravelTimes);
    setRecalculatedTravelTimes(newTravelTimes);
    return newTravelTimes;
  };

  // Recalculate when capacity changes
  useEffect(() => {
    if (whatIfMode && Object.keys(capacityChanges).length > 0) {
      recalculateTravelTimes();
    } else {
      setRecalculatedTravelTimes({});
    }
  }, [capacityChanges, whatIfMode, allSchools]);

  // Get marker color
  const getMarkerColor = (school) => {
    const capacity = parseInt(capacityChanges[school.id] || school.capacity || school.design_capacity || 0);
    const enrollment = parseInt(school.enrollment || school.current_enrollment || 0);
    const utilization = capacity > 0 ? (enrollment / capacity) * 100 : 0;

    if (utilization >= 120) return '#dc2626';
    if (utilization >= 100) return '#f97316';
    if (utilization >= 85) return '#fbbf24';
    return '#22c55e';
  };

  // Filter schools
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

    const activeTravelTimes = whatIfMode && Object.keys(recalculatedTravelTimes).length > 0 
      ? recalculatedTravelTimes 
      : {};

    // DISTRICT HEATMAP - with better debugging
    if (showHeatmap && travelTimeData.length > 0) {
      const districtTravelTime = {};
      
      console.log('=== PROCESSING DISTRICT HEATMAP ===');
      console.log('Travel Time Data Length:', travelTimeData.length);
      
      travelTimeData.forEach((point, idx) => {
        // Try multiple field names for district
        const district = point.district || point.from_district || point.district_name || point.name;
        
        // Try multiple field names for travel time
        const travelTime = parseFloat(
          point.avg_travel_time_minutes || 
          point.nearest_school_time || 
          point.travel_time || 
          point.time ||
          0
        );

        if (idx < 3) {
          console.log(`Point ${idx}:`, {
            district,
            travelTime,
            rawPoint: point
          });
        }

        if (!district) {
          console.warn('No district found for point:', point);
          return;
        }
        
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

      console.log('Districts Found:', Object.keys(districtTravelTime).length);
      console.log('District Stats:', districtTravelTime);

      Object.entries(districtTravelTime).forEach(([district, data]) => {
        if (data.count === 0) return;
        
        // Use recalculated time if in what-if mode
        const avgTime = whatIfMode && activeTravelTimes[district] 
          ? activeTravelTimes[district]
          : data.totalTime / data.count;
        
        console.log(`District ${district}: Avg Time = ${avgTime.toFixed(1)} min`);

        let centerLat = 0, centerLng = 0, validPoints = 0;
        
        data.points.forEach(point => {
          const coords = extractCoordinates(point);
          if (coords) {
            centerLat += coords.lat;
            centerLng += coords.lng;
            validPoints++;
          }
        });
        
        if (validPoints === 0) {
          console.warn(`No valid coordinates for district ${district}`);
          return;
        }
        
        centerLat = centerLat / validPoints;
        centerLng = centerLng / validPoints;
        
        // Color based on travel time - MORE SENSITIVE THRESHOLDS
        let color, opacity;
        if (avgTime > 20) {  // Changed from 30 to 20
          color = '#ef4444';
          opacity = 0.3;
        } else if (avgTime > 10) {  // Changed from 20 to 10
          color = '#f97316';
          opacity = 0.25;
        } else {
          color = '#22c55e';
          opacity = 0.2;
        }

        console.log(`District ${district}: Color = ${color}, Time = ${avgTime.toFixed(1)}`);

        const circle = L.circle([centerLat, centerLng], {
          radius: 3000,
          fillColor: color,
          fillOpacity: opacity,
          color: color,
          weight: 2,
          opacity: 0.5
        });

        const popupContent = `
          <div style="font-family: Inter, sans-serif; min-width: 200px;">
            <strong style="font-size: 14px; color: #1f2937;">${district}</strong><br>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Avg Travel Time:</strong> ${avgTime.toFixed(1)} min<br>
              <strong>Status:</strong> ${avgTime > 20 ? '🔴 High' : avgTime > 10 ? '🟠 Medium' : '🟢 Good'}<br>
              ${whatIfMode && activeTravelTimes[district] ? '<span style="color: #f59e0b; font-weight: 600;">⚠️ What-If Scenario Active</span>' : ''}
            </div>
          </div>
        `;

        circle.bindPopup(popupContent);
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
            <div style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 12px; margin: -12px -12px 12px -12px; border-radius: 4px 4px 0 0;">
              <strong style="font-size: 16px;">📍 Optimal Location ${location.location_id || ''}</strong><br>
              <span style="font-size: 12px; opacity: 0.9;">${location.recommended_district || ''}</span>
            </div>
            
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
              <strong style="color: #1f2937;">📊 Quantitative Impact:</strong><br>
              <div style="margin-top: 6px; font-size: 13px; line-height: 1.6;">
                <strong>• Students Served:</strong> ${studentsServed.toLocaleString()}<br>
                <strong>• Capacity:</strong> ${recommendedCapacity.toLocaleString()} seats<br>
                <strong>• Districts:</strong> ${districtsServed.length}<br>
                <strong>• Avg Distance:</strong> ${avgDistance.toFixed(1)} km
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

        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'Inter, sans-serif';
        popupContent.style.minWidth = '260px';
        
        popupContent.innerHTML = `
          <div style="background: ${getMarkerColor(school)}; color: white; padding: 10px; margin: -12px -12px 12px -12px; border-radius: 4px 4px 0 0;">
            <strong>${school.school_name || school.name || 'School'}</strong><br>
            <span style="font-size: 11px; opacity: 0.9;">${school.district || school.district_name || ''}</span>
          </div>
          
          ${whatIfMode ? `
            <div style="background: #fef3c7; padding: 8px; margin-bottom: 10px; border-radius: 4px;">
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
                Update & Recalculate
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
                <span style="font-size: 14px; font-weight: 600;">${adjustedCapacity.toLocaleString()}</span>
                ${adjustedCapacity !== originalCapacity ? `<br><span style="color: #3b82f6; font-size: 10px;">(was ${originalCapacity})</span>` : ''}
              </div>
              <div>
                <strong>Enrollment:</strong><br>
                <span style="font-size: 14px; font-weight: 600;">${enrollment.toLocaleString()}</span>
              </div>
              <div>
                <strong>Utilization:</strong><br>
                <span style="color: ${utilization >= 100 ? '#dc2626' : '#22c55e'}; font-size: 14px; font-weight: 600;">${utilization}%</span>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

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
  }, [allSchools, optimalLocations, travelTimeData, showSchools, showOptimal, showHeatmap, filters, whatIfMode, capacityChanges, recalculatedTravelTimes, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Main Map Container - Takes most of the space */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0"></div>

        {/* Controls - Top Right of Map */}
        <div className="absolute top-4 right-4 z-10 space-y-2">
          {/* Layer Toggles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Layers</h3>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSchools}
                onChange={(e) => setShowSchools(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Eye size={16} className={showSchools ? 'text-blue-600' : 'text-gray-400'} />
              <span className="text-sm">Schools</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOptimal}
                onChange={(e) => setShowOptimal(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <Eye size={16} className={showOptimal ? 'text-purple-600' : 'text-gray-400'} />
              <span className="text-sm">Optimal</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <Eye size={16} className={showHeatmap ? 'text-green-600' : 'text-gray-400'} />
              <span className="text-sm">Heatmap</span>
            </label>
          </div>

          {/* What-If Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={whatIfMode}
                onChange={(e) => {
                  setWhatIfMode(e.target.checked);
                  if (!e.target.checked) setCapacityChanges({});
                }}
                className="w-4 h-4 text-orange-600 rounded"
              />
              <Edit3 size={16} className={whatIfMode ? 'text-orange-600' : 'text-gray-400'} />
              <span className="text-sm font-semibold">What-If</span>
            </label>
            {whatIfMode && Object.keys(capacityChanges).length > 0 && (
              <button
                onClick={() => setCapacityChanges({})}
                className="mt-2 flex items-center space-x-1 text-xs text-blue-600"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Filter size={16} />
              <span className="text-sm font-semibold">Filters</span>
            </div>
            <span className="text-xs">{showFilters ? '▼' : '▶'}</span>
          </button>

          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3 max-w-xs">
              <div>
                <label className="text-xs font-semibold block mb-2">
                  Utilization: {filters.utilizationMin}%-{filters.utilizationMax}%
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

              <div>
                <label className="text-xs font-semibold block mb-1">Type</label>
                <select
                  value={filters.schoolType}
                  onChange={(e) => setFilters({...filters, schoolType: e.target.value})}
                  className="w-full p-2 text-sm border rounded"
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
                className="w-full bg-gray-200 hover:bg-gray-300 py-2 px-3 rounded text-sm"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Stats - Top Left */}
        <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-xl font-bold text-blue-600">{allSchools.length}</p>
              <p className="text-xs text-gray-600">Schools</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-600">{optimalLocations.length}</p>
              <p className="text-xs text-gray-600">Optimal</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{travelTimeData.length}</p>
              <p className="text-xs text-gray-600">Districts</p>
            </div>
          </div>
        </div>

        {/* Legend - Bottom Left */}
        <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs">
          <h3 className="font-semibold text-xs mb-2">Legend</h3>
          
          {showSchools && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Schools</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span>Critical (≥120%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Over (100-119%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>Near (85-99%)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>OK (&lt;85%)</span>
                </div>
              </div>
            </div>
          )}

          {showHeatmap && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Travel Time</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500 opacity-30"></div>
                  <span>&lt;10 min</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-orange-500 opacity-30"></div>
                  <span>10-20 min</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-500 opacity-30"></div>
                  <span>&gt;20 min</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="absolute top-20 right-4 z-10 bg-yellow-100 border border-yellow-400 rounded-lg shadow-lg p-3 max-w-sm text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800 mb-1">Debug Info</p>
                <pre className="whitespace-pre-wrap text-yellow-900 text-xs">{debugInfo}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - AI Insights */}
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
          <div className="text-center text-gray-500 text-sm py-8">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>Enable layers to see AI insights</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapTab;
