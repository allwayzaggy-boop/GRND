import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';
import * as Location from 'expo-location';

// Weather API: Open-Meteo (Free, No API Key Required)
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

export default function WeatherDashboard() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [unit, setUnit] = useState('metric'); // metric or imperial

  useEffect(() => {
    fetchWeather();
  }, [unit]);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback to default location (New York)
        fetchWeatherByCoords(40.7128, -74.0060, 'New York');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      
      // Get location name
      const reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const city = reverseGeo[0]?.city || 'Unknown';
      
      setLocation({ latitude, longitude, city });
      fetchWeatherByCoords(latitude, longitude, city);
    } catch (err) {
      setError('Failed to get location. Using default...');
      // Fallback to New York
      fetchWeatherByCoords(40.7128, -74.0060, 'New York');
    }
  };

  const fetchWeatherByCoords = async (lat, lon, cityName) => {
    try {
      const tempUnit = unit === 'metric' ? 'celsius' : 'fahrenheit';
      const windSpeedUnit = unit === 'metric' ? 'kmh' : 'mph';
      
      const response = await fetch(
        `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&temperature_unit=${tempUnit}&wind_speed_unit=${windSpeedUnit}&timezone=auto`
      );

      if (!response.ok) throw new Error('Weather API failed');

      const data = await response.json();
      
      setWeather({
        location: cityName,
        current: {
          temp: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          condition: getWeatherCondition(data.current.weather_code)
        },
        unit: unit === 'metric' ? '°C' : '°F'
      });

      // Process daily forecast
      const dailyForecast = data.daily.time.slice(0, 7).map((date, idx) => ({
        date,
        high: Math.round(data.daily.temperature_2m_max[idx]),
        low: Math.round(data.daily.temperature_2m_min[idx]),
        condition: getWeatherCondition(data.daily.weather_code[idx]),
        precipitation: data.daily.precipitation_sum[idx],
        windSpeed: Math.round(data.daily.wind_speed_10m_max[idx])
      }));

      setForecast(dailyForecast);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch weather data');
      setLoading(false);
    }
  };

  const getWeatherCondition = (code) => {
    // WMO Weather interpretation codes
    const conditions = {
      0: { text: 'Clear', icon: '☀️' },
      1: { text: 'Mostly Clear', icon: '🌤️' },
      2: { text: 'Partly Cloudy', icon: '⛅' },
      3: { text: 'Overcast', icon: '☁️' },
      45: { text: 'Foggy', icon: '🌫️' },
      48: { text: 'Foggy', icon: '🌫️' },
      51: { text: 'Drizzle', icon: '🌧️' },
      53: { text: 'Drizzle', icon: '🌧️' },
      55: { text: 'Drizzle', icon: '🌧️' },
      61: { text: 'Rain', icon: '🌧️' },
      63: { text: 'Rain', icon: '🌧️' },
      65: { text: 'Heavy Rain', icon: '⛈️' },
      71: { text: 'Snow', icon: '❄️' },
      73: { text: 'Snow', icon: '❄️' },
      75: { text: 'Heavy Snow', icon: '❄️' },
      77: { text: 'Snow Grains', icon: '❄️' },
      80: { text: 'Rain Showers', icon: '🌧️' },
      81: { text: 'Rain Showers', icon: '🌧️' },
      82: { text: 'Heavy Showers', icon: '⛈️' },
      85: { text: 'Snow Showers', icon: '❄️' },
      86: { text: 'Heavy Snow Showers', icon: '❄️' },
      95: { text: 'Thunderstorm', icon: '⛈️' },
      96: { text: 'Thunderstorm', icon: '⛈️' },
      99: { text: 'Thunderstorm', icon: '⛈️' }
    };
    return conditions[code] || { text: 'Unknown', icon: '🌡️' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WEATHER DASHBOARD</Text>
          <TouchableOpacity 
            style={styles.unitToggle} 
            onPress={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
          >
            <Text style={styles.unitText}>{unit === 'metric' ? '°C' : '°F'}</Text>
          </TouchableOpacity>
        </View>

        {/* Loading & Error States */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>Fetching weather data...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Current Weather Card */}
        {weather && !loading && (
          <>
            <View style={styles.currentCard}>
              <Text style={styles.location}>{weather.location}</Text>
              <View style={styles.tempContainer}>
                <Text style={styles.icon}>{weather.current.condition.icon}</Text>
                <View>
                  <Text style={styles.temperature}>{weather.current.temp}{weather.unit}</Text>
                  <Text style={styles.condition}>{weather.current.condition.text}</Text>
                </View>
              </View>
              
              <View style={styles.feelsLike}>
                <Text style={styles.feelsLikeText}>Feels like {weather.current.feelsLike}{weather.unit}</Text>
              </View>

              {/* Weather Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Humidity</Text>
                  <Text style={styles.detailValue}>{weather.current.humidity}%</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Wind Speed</Text>
                  <Text style={styles.detailValue}>{weather.current.windSpeed}</Text>
                </View>
              </View>
            </View>

            {/* 7-Day Forecast */}
            <View style={styles.forecastSection}>
              <Text style={styles.forecastTitle}>7-DAY FORECAST</Text>
              <FlatList
                data={forecast}
                keyExtractor={(item, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.forecastCard}>
                    <Text style={styles.forecastDate}>{formatDate(item.date)}</Text>
                    <Text style={styles.forecastIcon}>{getWeatherCondition(item.weather_code).icon}</Text>
                    <View style={styles.tempRange}>
                      <Text style={styles.tempHigh}>{item.high}{weather.unit}</Text>
                      <Text style={styles.tempLow}>{item.low}{weather.unit}</Text>
                    </View>
                    <Text style={styles.forecastCondition}>{getWeatherCondition(item.weather_code).text}</Text>
                    {item.precipitation > 0 && (
                      <Text style={styles.precipitation}>🌧️ {item.precipitation}mm</Text>
                    )}
                  </View>
                )}
                scrollEnabled={false}
              />
            </View>

            {/* Refresh Button */}
            <TouchableOpacity style={styles.refreshButton} onPress={fetchWeather}>
              <Text style={styles.refreshText}>🔄 REFRESH</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  unitToggle: {
    backgroundColor: '#111',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  unitText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 14,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#D4AF37',
    marginTop: 15,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#1A0000',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#B22222',
    marginBottom: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  currentCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#222',
  },
  location: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 60,
    marginRight: 15,
  },
  temperature: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
  },
  condition: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  feelsLike: {
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  feelsLikeText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 5,
  },
  detailValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forecastSection: {
    marginBottom: 30,
  },
  forecastTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 15,
    letterSpacing: 1,
  },
  forecastCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  forecastDate: {
    color: '#D4AF37',
    fontWeight: 'bold',
    width: 50,
  },
  forecastIcon: {
    fontSize: 32,
    marginHorizontal: 10,
  },
  tempRange: {
    flex: 1,
  },
  tempHigh: {
    color: 'white',
    fontWeight: 'bold',
  },
  tempLow: {
    color: '#999',
    fontSize: 12,
  },
  forecastCondition: {
    color: '#999',
    fontSize: 11,
    marginRight: 10,
    maxWidth: 70,
  },
  precipitation: {
    color: '#4169E1',
    fontSize: 10,
  },
  refreshButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  refreshText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});
