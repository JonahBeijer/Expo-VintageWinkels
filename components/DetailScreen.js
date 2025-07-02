import React, { useEffect, useState, useRef } from 'react'; // useRef toegevoegd
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DetailScreen({ route, navigation }) {
    const { item } = route.params;
    const screenWidth = Dimensions.get('window').width;
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [note, setNote] = useState('');
    const [review, setReview] = useState('');
    const [savedNote, setSavedNote] = useState('');
    const [savedReview, setSavedReview] = useState('');
    const noteKey = `note_${item.id}`;
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const loadDarkMode = async () => {
            const savedMode = await AsyncStorage.getItem('darkMode');
            if (savedMode !== null) {
                setIsDarkMode(JSON.parse(savedMode));
            }
        };
        const unsubscribe = navigation.addListener('focus', loadDarkMode);
        loadDarkMode();
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        setCarouselIndex(0);
        loadNote();
    }, [item.id]);

    const navigateToHotspotMap = () => {
        navigation.navigate('LiveLocation', {
            hotspot: item,
            animateZoom: true,
        });
    };

    const saveNote = async () => {
        try {
            const data = JSON.stringify({ note, review });
            await AsyncStorage.setItem(noteKey, data);
            setSavedNote(note);
            setSavedReview(review);
            setModalVisible(false);
            Alert.alert('Opgeslagen!', 'Je notitie en review zijn opgeslagen.');
        } catch (error) {
            console.error('Fout bij opslaan van notitie:', error);
        }
    };

    const loadNote = async () => {
        try {
            const storedData = await AsyncStorage.getItem(noteKey);
            if (storedData) {
                const { note: savedN, review: savedR } = JSON.parse(storedData);
                setSavedNote(savedN);
                setSavedReview(savedR);
                setNote(savedN);
                setReview(savedR);
            } else {
                setNote('');
                setReview('');
                setSavedNote('');
                setSavedReview('');
            }
        } catch (error) {
            console.error('Fout bij laden van notitie:', error);
        }
    };

    return (
        <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
            <View style={styles.carouselContainer}>
                <Carousel
                    loop={false}
                    width={screenWidth}
                    height={250}
                    data={item.image_urls}
                    renderItem={({ item: imageUrl }) => (
                        <View style={styles.slide}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.image}
                            />
                        </View>
                    )}

                    onSnapToItem={(index) => setCarouselIndex(index)}
                />
                <View style={styles.paginationContainer}>
                    {item.image_urls.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                carouselIndex === index && styles.paginationDotActive,
                            ]}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.infoContainer}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>{item.naam}</Text>
                <Text style={[styles.address, isDarkMode && styles.darkText]}>{item.adres}</Text>
                <Text style={[styles.subTitle2, isDarkMode && styles.darkText]}>Openingstijden:</Text>
                {Object.keys(item.openingsuren).map((day, index) => (
                    <Text key={index} style={[styles.openingHours, isDarkMode && styles.darkText]}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}: {item.openingsuren[day]}
                    </Text>
                ))}


                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, isDarkMode && styles.darkButton]}
                        onPress={navigateToHotspotMap}
                    >
                        <Text style={[styles.buttonText, isDarkMode && styles.darkButtonText]}>Bekijk op de Kaart</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, isDarkMode && styles.darkButton]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={[styles.buttonText, isDarkMode && styles.darkButtonText]}>Notitie maken</Text>
                    </TouchableOpacity>
                </View>

                {savedNote !== '' || savedReview !== '' ? (
                    <View style={[styles.savedNoteBox, isDarkMode && styles.darkSubBox]}>
                        <Text style={[styles.subTitle, isDarkMode && styles.darkText]}>Notities:</Text>
                        <Text style={[styles.savedText, isDarkMode && styles.darkText]}>{savedNote}</Text>
                        <Text style={[styles.subTitle, isDarkMode && styles.darkText]}>Review:</Text>
                        <Text style={[styles.savedText, isDarkMode && styles.darkText]}>{savedReview}</Text>
                    </View>
                ) : null}
            </View>

            {/* Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
                        <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>Notitie en Review</Text>

                        <TextInput
                            placeholder="Typ hier je notitie..."
                            placeholderTextColor={isDarkMode ? '#888' : '#999'}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            style={[styles.input, isDarkMode && styles.darkInput]}
                        />
                        <TextInput
                            placeholder="Geef een review..."
                            placeholderTextColor={isDarkMode ? '#888' : '#999'}
                            value={review}
                            onChangeText={setReview}
                            multiline
                            style={[styles.input, isDarkMode && styles.darkInput]}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButton} onPress={saveNote}>
                                <Text style={styles.modalButtonText}>Opslaan</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalButtonText}>Annuleren</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    carouselContainer: {
        position: 'relative',
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 250,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 10,
        width: '100%',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#fff',
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    infoContainer: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
        textAlign: 'center',
        marginTop: 20,
    },

    address: {
        fontSize: 18,
        color: '#555',
        marginBottom: 20,
        textAlign: 'center',
    },
    subTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 6,
        color: '#333',
    },
    subTitle2: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 6,
        color: '#333',
        textAlign: 'center'
    },
    openingHours: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
        textAlign: 'center'

    },
    buttonContainer: {
        marginTop: 20,
    },
    button: {
        backgroundColor: '#1e90ff',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    darkButton: {
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#555',
    },
    darkButtonText: {
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 15,
        borderRadius: 8,
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
        color: '#000',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalButton: {
        backgroundColor: '#1e90ff',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#ff4d4d',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    savedNoteBox: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
    },
    savedText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    darkContainer: {
        backgroundColor: '#121212',
    },
    darkText: {
        color: '#fff',
    },
    darkInput: {
        backgroundColor: '#1e1e1e',
        borderColor: '#444',
        color: '#fff',
    },
    darkModalContent: {
        backgroundColor: '#1a1a1a',
    },
    darkSubBox: {
        backgroundColor: '#2a2a2a',
    },
    darkModalTitle: {
        color: '#fff',
    },
});