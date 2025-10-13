import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  
  const [allSchools, setAllSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('MapTab component rendering');

  // Fetch data
  useEffect(() => {
    console.log('Fetching data...');
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://n8n.hantoush.space/webhook/school-analysis', { 
          method: 'POST' 
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched data:', data);
        
        // Use all schools or overcapacity schools
        const schools = data.all_schools || data.overcapacity_schools || [];
        console.log('Schools to display:', schools.length);
        setAllSchools(schools);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    console.log('Map initialization effect running');
    console.log('mapRef.current:', mapRef.current);
    console.log('mapInstanceRef.current:', mapInstanceRef.current);

    if (!mapRef.current) {
      console.log('No mapRef.current, skipping');
      return;
    }

    if (mapInstanceRef.current) {
      console.log('Map already initialized, skipping');
      return;
    }

    console.log('Creating map...');
    try {
      const riyadhCenter = [24.7136, 46.6753];
      const map = L.map(mapRef.current).setView(riyadhCenter, 11);
      console.log('Map created:', map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      console.log('Tile layer added');

      markersLayerRef.current = L.layerGroup().addTo(map);
      console.log('Markers layer created');

      mapInstanceRef.current = map;
      console.log('Map initialization complete');

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map: ' + error.message);
    }

    return () => {
      console.log('Cleanup effect running');
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add markers
  useEffect(() => {
    console.log('Markers effect running');
    console.log('Loading:', loading);
    console.log('Schools count:', allSchools.length);
    console.log('markersLayerRef.current:', markersLayerRef.current);

    if (!markersLayerRef.current || loading || allSchools.length === 0) {
      console.log('Skipping markers update');
      return;
    }

    console.log('Clearing and adding markers...');
    markersLayerRef.current.clearLayers();

    let addedCount = 0;
    allSchools.forEach((school, index) => {
      // Try to get coordinates
      const lat = parseFloat(school.lat || school.latitude);
      const lng = parseFloat(school.lon || school.lng || school.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        console.log(`School ${index} has invalid coordinates:`, school);
        return;
      }

      if (lat < 24 || lat > 25 || lng < 46 || lng > 47) {
        console.log(`School ${index} coordinates out of bounds:`, lat, lng);
        return;
      }

      const utilization = parseFloat(school.utilization || school.utilization_rate || 0);
      
      let color;
      if (utilization > 120) color = '#dc2626';
      else if (utilization > 100) color = '#f97316';
      else if (utilization > 85) color = '#eab308';
      else color = '#22c55e';

      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      const name = school.name || school.school_name || 'Unknown';
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif;">
          <strong>${name}</strong><br>
          Utilization: ${utilization.toFixed(1)}%
        </div>
      `);

      marker.addTo(markersLayerRef.current);
      addedCount++;
    });

    console.log(`Added ${addedCount} markers out of ${allSchools.length} schools`);
  }, [allSchools, loading]);

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error Loading Map</h3>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Riyadh Schools Map - Debug Version
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Loading: {loading ? 'Yes' : 'No'} | Schools: {allSchools.length}
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading map data...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapRef} 
            style={{ height: '600px', width: '100%' }}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900"
          />
        )}

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Critical (&gt;120%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Over Capacity (100-120%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Near Capacity (85-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Acceptable (&lt;85%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapTab;
