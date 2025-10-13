import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AIInsightsPanel from '../shared/AIInsightsPanel';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapTab = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  
  const [mapLayer, setMapLayer] = useState('capacity');
  const [capacityData, setCapacityData] = useState(null);
  const [optimalLocations, setOptimalLocations] = useState(null);
  const [travelTimeData, setTravelTimeData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [capacityRes, optimalRes, travelRes] = await Promise.all([
          fetch('https://n8n.hantoush.space/webhook/3d4f2de1-22fc-4e9e-abb9-8fc73a046df5'),
          fetch('https://n8n.hantoush.space/webhook/8bfc0a11-ee54-4f36-9c1a-b7fba1c9d71e'),
          fetch('https://n8n.hantoush.space/webhook/d11e24e0-3a86-4b19-b4b5-4e6dfb8e2af6')
        ]);

        const capacity = await capacityRes.json();
        const optimal = await optimalRes.json();
        const travel = await travelRes.json();

        console.log('Capacity Data:', capacity);
        console.log('Optimal Locations:', optimal);
        console.log('Travel Time Data:', travel);

        setCapacityData(capacity);
        setOptimalLocations(optimal);
        setTravelTimeData(travel);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Riyadh coordinates
    const riyadhCenter = [24.7136, 46.6753];

    const map = L.map(mapRef.current).setView(riyadhCenter, 11);

    // Add CartoDB tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Create markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Helper function to extract coordinates from various field names
  const extractCoordinates = (item) => {
    // Try different possible field name patterns
    const latFields = ['latitude', 'lat', 'Latitude', 'LAT', 'y'];
    const lngFields = ['longitude', 'lng', 'lon', 'Longitude', 'LONGITUDE', 'LON', 'x'];
    
    let lat = null;
    let lng = null;

    // Search for latitude
    for (const field of latFields) {
      if (item[field] !== undefined && item[field] !== null) {
        lat = parseFloat(item[field]);
        break;
      }
    }

    // Search for longitude
    for (const field of lngFields) {
      if (item[field] !== undefined && item[field] !== null) {
        lng = parseFloat(item[field]);
        break;
      }
    }

    // Check if we found valid coordinates
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // Validate coordinates are within reasonable bounds for Riyadh
      if (lat >= 24 && lat <= 25 && lng >= 46 && lng <= 47) {
        return { lat, lng };
      }
    }

    return null;
  };

  // Update markers when layer or data changes
  useEffect(() => {
    if (!markersLayerRef.current || loading) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    if (mapLayer === 'capacity' && capacityData?.schools) {
      console.log('Adding capacity markers, total schools:', capacityData.schools.length);
      
      let addedMarkers = 0;
      capacityData.schools.forEach((school, index) => {
        const coords = extractCoordinates(school);
        
        if (coords) {
          const utilizationRate = parseFloat(school.utilization_rate || 0);
          
          // Determine color based on utilization
          let color = 'green';
          if (utilizationRate > 120) {
            color = 'red';
          } else if (utilizationRate > 100) {
            color = 'orange';
          } else if (utilizationRate > 85) {
            color = 'yellow';
          }

          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });

          marker.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
              <strong>${school.school_name || 'Unknown School'}</strong><br>
              <strong>District:</strong> ${school.district_name || 'N/A'}<br>
              <strong>Capacity:</strong> ${school.capacity || 'N/A'}<br>
              <strong>Students:</strong> ${school.current_enrollment || 'N/A'}<br>
              <strong>Utilization:</strong> ${utilizationRate.toFixed(1)}%<br>
              <strong>Type:</strong> ${school.school_type || 'N/A'}
            </div>
          `);

          marker.addTo(markersLayerRef.current);
          addedMarkers++;
        } else {
          console.warn(`School ${index} missing valid coordinates:`, school);
        }
      });
      
      console.log(`Successfully added ${addedMarkers} capacity markers`);
    }

    if (mapLayer === 'optimal' && optimalLocations?.recommendations) {
      console.log('Adding optimal location markers, total:', optimalLocations.recommendations.length);
      
      let addedMarkers = 0;
      optimalLocations.recommendations.forEach((location, index) => {
        const coords = extractCoordinates(location);
        
        if (coords) {
          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 10,
            fillColor: 'purple',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });

          marker.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
              <strong>Recommended Location</strong><br>
              <strong>School Type:</strong> ${location.school_type || 'Elementary'}<br>
              <strong>Gender:</strong> ${location.gender || 'Boys'}<br>
              <strong>Max Acceptable Travel:</strong> ${location.max_acceptable_travel_time_from_district_center || 'N/A'} min<br>
              <strong>Methodology:</strong> ${location.methodology || 'K-means clustering'}
            </div>
          `);

          marker.addTo(markersLayerRef.current);
          addedMarkers++;
        } else {
          console.warn(`Optimal location ${index} missing valid coordinates:`, location);
        }
      });
      
      console.log(`Successfully added ${addedMarkers} optimal location markers`);
    }

    if (mapLayer === 'heatmap' && travelTimeData?.heatmap_data) {
      console.log('Adding travel time markers, total:', travelTimeData.heatmap_data.length);
      
      let addedMarkers = 0;
      travelTimeData.heatmap_data.forEach((point, index) => {
        const coords = extractCoordinates(point);
        
        if (coords) {
          const travelTime = parseFloat(point.avg_travel_time_minutes || 0);
          
          // Determine color based on travel time
          let color = 'green';
          if (travelTime > 30) {
            color = 'red';
          } else if (travelTime > 20) {
            color = 'orange';
          }

          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 6,
            fillColor: color,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
          });

          marker.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
              <strong>Travel Time Analysis</strong><br>
              <strong>District:</strong> ${point.from_district || 'N/A'}<br>
              <strong>Avg Travel Time:</strong> ${travelTime.toFixed(1)} min
            </div>
          `);

          marker.addTo(markersLayerRef.current);
          addedMarkers++;
        } else {
          console.warn(`Travel time point ${index} missing valid coordinates:`, point);
        }
      });
      
      console.log(`Successfully added ${addedMarkers} travel time markers`);
    }
  }, [mapLayer, capacityData, optimalLocations, travelTimeData, loading]);

  return (
    <div className="space-y-6">
      {/* Layer Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMapLayer('capacity')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mapLayer === 'capacity'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            School Locations (20)
          </button>
          <button
            onClick={() => setMapLayer('optimal')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mapLayer === 'optimal'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Optimal Locations (3)
          </button>
          <button
            onClick={() => setMapLayer('heatmap')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mapLayer === 'heatmap'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Travel Time Heatmap
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mapLayer === 'capacity' && 'School Capacity Overview'}
            {mapLayer === 'optimal' && 'Recommended New School Locations'}
            {mapLayer === 'heatmap' && 'Student Travel Time Analysis'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {mapLayer === 'capacity' && 'Showing 20 overcapacity schools. Click any marker for details.'}
            {mapLayer === 'optimal' && 'AI-recommended locations for new schools based on demand analysis.'}
            {mapLayer === 'heatmap' && 'Average travel time from district centers to nearest schools.'}
          </p>
        </div>

        <div 
          ref={mapRef} 
          style={{ height: '600px', width: '100%' }}
          className="rounded-lg border border-gray-200 dark:border-gray-700"
        />

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {mapLayer === 'capacity' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Critical (&gt;120%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Over Capacity (100-120%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Near Capacity (85-100%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Acceptable (&lt;85%)</span>
              </div>
            </>
          )}
          {mapLayer === 'optimal' && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Recommended Location</span>
            </div>
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
