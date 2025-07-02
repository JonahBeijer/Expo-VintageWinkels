import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Dimensions, ActivityIndicator, ScrollView, Text, TouchableOpacity, Image } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Callout } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const HOTSPOTS_CACHE_KEY = 'hotspots_cache';

const LiveLocation = ({ route, darkMode }) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [initialRegion, setInitialRegion] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [showFavorites, setShowFavorites] = useState(false);
    const [heading, setHeading] = useState(0);
    const [selectedMarkerData, setSelectedMarkerData] = useState({ id: null, userImage: null });

    const mapRef = useRef(null);
    const navigation = useNavigation();
    const { hotspot: focusedHotspot } = route.params || {};

    useFocusEffect(
        React.useCallback(() => {
            const loadFavorites = async () => {
                try {
                    const savedFavorites = await AsyncStorage.getItem('favorites');
                    if (savedFavorites) {
                        setFavorites(JSON.parse(savedFavorites));
                    }
                } catch (error) {
                    console.error("Fout bij opnieuw laden van favorieten:", error);
                }
            };
            loadFavorites();
        }, [])
    );

    useEffect(() => {
        const loadAndFetchHotspots = async () => {
            setLoading(true);
            let cachedData = null;
            try {
                const storedData = await AsyncStorage.getItem(HOTSPOTS_CACHE_KEY);
                if (storedData) {
                    cachedData = JSON.parse(storedData);
                    setHotspots(cachedData);
                }
            } catch (error) {
                console.error("Kon cache niet lezen:", error);
            }

            try {
                const response = await fetch(`https://stud.hosted.hr.nl/1037134/Hotspots.json?timestamp=${new Date().getTime()}`);
                const freshData = await response.json();
                const freshItems = freshData.items || [];
                if (JSON.stringify(freshItems) !== JSON.stringify(cachedData)) {
                    setHotspots(freshItems);
                    await AsyncStorage.setItem(HOTSPOTS_CACHE_KEY, JSON.stringify(freshItems));
                }
            } catch (error) {
                console.log("Kon geen nieuwe data ophalen, waarschijnlijk offline.");
            } finally {
                const dataToUse = hotspots.length > 0 ? hotspots : cachedData || [];
                if (focusedHotspot) {
                    setInitialRegion({ latitude: focusedHotspot.latitude, longitude: focusedHotspot.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
                } else if (dataToUse.length > 0) {
                    const latitudes = dataToUse.map(h => h.latitude);
                    const longitudes = dataToUse.map(h => h.longitude);
                    setInitialRegion({ latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2, longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2, latitudeDelta: (Math.max(...latitudes) - Math.min(...latitudes)) * 1.5 || 0.1, longitudeDelta: (Math.max(...longitudes) - Math.min(...longitudes)) * 1.5 || 0.1 });
                }
                setLoading(false);
            }
        };
        loadAndFetchHotspots();
    }, [focusedHotspot]);

    useEffect(() => {
        let headingSubscription, locationSubscription;
        const startWatchers = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            locationSubscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, (location) => {
                setCurrentLocation(location.coords);
            });
            headingSubscription = await Location.watchHeadingAsync(newHeading => {
                setHeading(newHeading.trueHeading);
            });
        };
        startWatchers();
        return () => {
            if (headingSubscription) headingSubscription.remove();
            if (locationSubscription) locationSubscription.remove();
        };
    }, []);

    const onMarkerPress = async (hotspot) => {
        try {
            const userImagesKey = `user_images_${hotspot.id}`;
            const storedImages = await AsyncStorage.getItem(userImagesKey);
            let imageToShow = null;
            if (storedImages) {
                const images = JSON.parse(storedImages);
                if (images.length > 0) {
                    imageToShow = images[0];
                }
            }
            setSelectedMarkerData({ id: hotspot.id, userImage: imageToShow });
        } catch (error) {
            console.error("Fout bij laden van marker foto:", error);
        }
    };

    const goToCurrentLocation = () => {
        if (currentLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            }, 1000);
        }
    };

    const isOpenNow = (hotspot) => {
        const days = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
        const day = days[new Date().getDay()];
        const todayHours = hotspot.openingsuren?.[day];
        if (!todayHours || todayHours.toLowerCase() === "gesloten") return false;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [openTime, closeTime] = todayHours.split(" - ").map(time => {
            const [hours, minutes] = time.split(":").map(Number);
            return hours * 60 + minutes;
        });
        return currentMinutes >= openTime && currentMinutes <= closeTime;
    };

    const displayedHotspots = hotspots.filter(hotspot => {
        if (!hotspot || typeof hotspot.openingsuren === 'undefined') return false;
        const isOpen = isOpenNow(hotspot);
        const isFavorite = favorites.includes(hotspot.id);
        if (showFavorites && !isFavorite) return false;
        if (filter === "open" && !isOpen) return false;
        return true;
    });

    return (
        <View style={styles.container}>
            {loading && hotspots.length === 0 ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : (
                <>
                    <MapView
                        style={styles.map}
                        initialRegion={initialRegion}
                        ref={mapRef}
                        showsUserLocation={true}
                        showsCompass={false}
                        userInterfaceStyle={darkMode ? 'dark' : 'light'}
                    >
                        {displayedHotspots.map((hotspot) => (
                            <Marker
                                key={hotspot.id}
                                coordinate={{ latitude: hotspot.latitude, longitude: hotspot.longitude }}
                                tracksViewChanges={selectedMarkerData.id === hotspot.id}
                                onPress={() => onMarkerPress(hotspot)}
                            >
                                <View style={[styles.marker, favorites.includes(hotspot.id) && styles.favoriteMarker]}>
                                    {favorites.includes(hotspot.id) && <Ionicons name="star" size={12} color="#fff" />}
                                </View>
                                <Callout tooltip onPress={() => navigation.navigate('Detail', { item: hotspot })}>
                                    <View style={[styles.calloutContainer, darkMode && styles.darkCalloutContainer]}>
                                        {selectedMarkerData.id === hotspot.id && selectedMarkerData.userImage && (
                                            <Image
                                                source={{ uri: selectedMarkerData.userImage }}
                                                style={styles.calloutImage}
                                                onLoadEnd={() => {
                                                    if (mapRef.current) {
                                                        // Dit is een workaround om de callout opnieuw te laten tekenen na het laden van de afbeelding
                                                        // en de kaart-glitch te voorkomen.
                                                    }
                                                }}
                                            />
                                        )}
                                        <Text style={[styles.calloutTitle, darkMode && styles.darkCalloutText]}>{hotspot.naam}</Text>
                                        <Text style={[styles.calloutDescription, darkMode && styles.darkCalloutText]}>Tik voor details</Text>
                                    </View>
                                </Callout>
                            </Marker>
                        ))}
                    </MapView>

                    <View style={styles.filterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                            <TouchableOpacity onPress={goToCurrentLocation} style={[styles.toggleButton, darkMode && styles.darkButton]}>
                                <Ionicons name="navigate-outline" size={16} color={darkMode ? "#fff" : "#007AFF"} style={{ marginRight: 5 }} />
                                <Text style={[styles.toggleButtonText, darkMode && styles.darkButtonText]}>Mijn locatie</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setFilter(filter === "open" ? "all" : "open") }} style={[styles.toggleButton, darkMode && styles.darkButton, filter === "open" && styles.toggleButtonActive]}>
                                <Ionicons name="time-outline" size={16} color={filter === "open" || darkMode ? "#fff" : "#007AFF"} style={{ marginRight: 5 }} />
                                <Text style={[styles.toggleButtonText, darkMode && styles.darkButtonText, filter === "open" && styles.toggleButtonTextActive]}>Nu open</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowFavorites(prev => !prev)} style={[styles.toggleButton, darkMode && styles.darkButton, showFavorites && styles.toggleButtonActive]}>
                                <Ionicons name="heart-outline" size={16} color={showFavorites || darkMode ? "#fff" : "#007AFF"} style={{ marginRight: 5 }} />
                                <Text style={[styles.toggleButtonText, darkMode && styles.darkButtonText, showFavorites && styles.toggleButtonTextActive]}>Favorieten</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    <View style={[styles.compassContainer, darkMode && styles.darkButton]}>
                        <Ionicons name="arrow-up-outline" size={28} color={darkMode ? "#fff" : "#007AFF"} style={{ transform: [{ rotate: `${heading}deg` }] }} />
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: '#f0f0f0',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    filterContainer: {
        position: "absolute",
        top: 15,
        left: 0,
        right: 0,
    },
    scrollContainer: {
        paddingHorizontal: 15,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    toggleButtonText: {
        color: "#007AFF",
        fontSize: 14,
        fontWeight: "600",
    },
    darkButton: {
        backgroundColor: 'rgba(40, 40, 40, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    darkButtonText: {
        color: '#fff',
    },
    toggleButtonActive: {
        backgroundColor: "#007AFF",
    },
    toggleButtonTextActive: {
        color: "#fff",
        fontWeight: "bold",
    },
    compassContainer: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    marker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.9)',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteMarker: {
        backgroundColor: 'rgba(255, 215, 0, 1)',
    },
    calloutContainer: {
        width: 150,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderColor: '#ddd',
        borderWidth: 1,
        alignItems: 'center',
    },
    darkCalloutContainer: {
        backgroundColor: '#333',
        borderColor: '#555',
    },
    calloutImage: {
        width: 130,
        height: 80,
        borderRadius: 8,
        marginBottom: 8,
    },
    calloutTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    darkCalloutText: {
        color: '#fff',
    },
    calloutDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default LiveLocation;