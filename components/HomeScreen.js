import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOTSPOTS_CACHE_KEY = 'hotspots_cache';

const getDayName = () => {
    const days = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    return days[new Date().getDay()];
};

const isOpenNow = (openingsuren) => {
    const day = getDayName();
    const todayHours = openingsuren?.[day];
    if (!todayHours || todayHours.toLowerCase() === "gesloten") return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openTime, closeTime] = todayHours.split(" - ").map(time => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    });
    return currentMinutes >= openTime && currentMinutes <= closeTime;
};

export default function HomeScreen({ navigation, darkMode }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [modalVisible, setModalVisible] = useState(false);
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const loadAndFetchHotspots = async () => {
            let cachedData = null;
            try {
                const storedData = await AsyncStorage.getItem(HOTSPOTS_CACHE_KEY);
                if (storedData) {
                    cachedData = JSON.parse(storedData);
                    setData(cachedData);
                }
            } catch (error) {
                console.error("Kon cache niet lezen:", error);
            }

            try {
                const response = await fetch(`https://stud.hosted.hr.nl/1037134/Hotspots.json?timestamp=${new Date().getTime()}`);
                const freshData = await response.json();
                const freshItems = freshData.items || [];

                // 3. Vergelijk en update alleen als de data echt nieuw is
                if (JSON.stringify(freshItems) !== JSON.stringify(cachedData)) {
                    setData(freshItems);
                    await AsyncStorage.setItem(HOTSPOTS_CACHE_KEY, JSON.stringify(freshItems));
                }
            } catch (error) {
                console.log("Kon geen nieuwe data ophalen, waarschijnlijk offline.");
            } finally {
                setLoading(false); // Stop altijd met laden
            }
        };

        const loadFavorites = async () => {
            const savedFavorites = await AsyncStorage.getItem('favorites');
            if (savedFavorites) {
                setFavorites(JSON.parse(savedFavorites));
            }
        };

        loadAndFetchHotspots();
        loadFavorites();
    }, []);

    const saveFavorites = async (favoritesList) => {
        await AsyncStorage.setItem('favorites', JSON.stringify(favoritesList));
    };

    const toggleFavorite = (itemId) => {
        let updatedFavorites;
        if (favorites.includes(itemId)) {
            updatedFavorites = favorites.filter(fav => fav !== itemId);
        } else {
            updatedFavorites = [...favorites, itemId];
        }
        setFavorites(updatedFavorites);
        saveFavorites(updatedFavorites);
    };

    const filteredData = Array.isArray(data) ? data.filter(item => {
        if (!item || typeof item.openingsuren === 'undefined') return false; // Extra check voor data-integriteit
        if (filter === "open") return isOpenNow(item.openingsuren);
        if (filter === "closed") return !isOpenNow(item.openingsuren);
        return true;
    }) : [];

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[ styles.item, { backgroundColor: darkMode ? '#222' : '#fff', borderWidth: 1, borderColor: darkMode ? '#555' : '#ddd' } ]}
            onPress={() => navigation.navigate('Detail', { item, darkMode })}
        >
            <Image source={{ uri: item.image_urls[0] }} style={styles.image} />
            <Text style={[styles.title, { color: darkMode ? '#fff' : '#333' }]}>
                {item.naam}
            </Text>
            <TouchableOpacity
                style={[styles.favoriteButton, { backgroundColor: darkMode ? '#555' : '#e0e0e0' }]}
                onPress={() => toggleFavorite(item.id)}
            >
                <Text style={styles.favoriteText}>
                    {favorites.includes(item.id) ? "❤️" : "🤍"}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    if (loading && data.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#121212' : '#f0f0f0', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={darkMode ? "#fff" : "#6200ee"} />
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: darkMode ? '#121212' : '#f0f0f0' }]}>
            <SafeAreaProvider>
                <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#121212' : '#f0f0f0' }]}>
                    <TouchableOpacity
                        style={[styles.pickerContainer, { backgroundColor: darkMode ? '#121212' : '#fff', borderColor: darkMode ? '#555' : '#ccc' }]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={[styles.pickerText, { color: darkMode ? '#ffffff' : '#333' }]}>
                            Filter: {filter === "all" ? "Alle" : filter === "open" ? "Open" : "Gesloten"}
                        </Text>
                    </TouchableOpacity>

                    <Modal
                        visible={modalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContainer, { backgroundColor: darkMode ? '#333' : '#ffffff' }]}>
                                <Picker
                                    selectedValue={filter}
                                    onValueChange={(itemValue) => {
                                        setFilter(itemValue);
                                        setModalVisible(false);
                                    }}
                                    itemStyle={{ color: darkMode ? '#fff' : '#000' }}
                                >
                                    <Picker.Item label="Alle" value="all" />
                                    <Picker.Item label="Open" value="open" />
                                    <Picker.Item label="Gesloten" value="closed" />
                                </Picker>
                            </View>
                        </View>
                    </Modal>

                    <FlatList
                        style={{ backgroundColor: darkMode ? '#121212' : '#f0f0f0' }}
                        contentContainerStyle={styles.flatListContent}
                        data={filteredData}
                        renderItem={renderItem}
                        keyExtractor={item => item.id.toString()}
                        numColumns={2}
                    />
                </SafeAreaView>
            </SafeAreaProvider>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalContainer: {
        padding: 20,
        borderRadius: 8,
        width: '80%',
    },
    pickerContainer: {
        marginHorizontal: 10,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        marginBottom: 15,
        alignItems: 'center',
        marginTop : 15
    },
    pickerText: {
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    item: {
        flex: 1,
        flexDirection: 'column',
        padding: 15,
        marginVertical: 10,
        marginHorizontal: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginBottom: 10,
        resizeMode: 'cover',
    },
    favoriteButton: {
        marginTop: 10,
        padding: 10,
        borderRadius: 50,
    },
    favoriteText: {
        fontSize: 24,
    },
    flatListContent: {
        paddingHorizontal: 10,
    },
});