import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, Modal, TextInput, TouchableOpacity, Alert, Share, FlatList } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function DetailScreen({ route, navigation }) {
    const { item } = route.params;
    const screenWidth = Dimensions.get('window').width;

    const [carouselIndex, setCarouselIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [note, setNote] = useState('');
    const [review, setReview] = useState('');
    const [savedNote, setSavedNote] = useState('');
    const [savedReview, setSavedReview] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [userImages, setUserImages] = useState([]);

    const noteKey = `note_${item.id}`;
    const userImagesKey = `user_images_${item.id}`;

    const loadData = async () => {
        try {
            const savedMode = await AsyncStorage.getItem('darkMode');
            if (savedMode !== null) setIsDarkMode(JSON.parse(savedMode));

            const storedData = await AsyncStorage.getItem(noteKey);
            if (storedData) {
                const { note: savedN, review: savedR } = JSON.parse(storedData);
                setSavedNote(savedN || '');
                setSavedReview(savedR || '');
                setNote(savedN || '');
                setReview(savedR || '');
            } else {
                setSavedNote('');
                setSavedReview('');
                setNote('');
                setReview('');
            }

            const storedImages = await AsyncStorage.getItem(userImagesKey);
            if (storedImages) {
                setUserImages(JSON.parse(storedImages));
            } else {
                setUserImages([]);
            }
        } catch (error) {
            console.error('Fout bij laden van data:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [navigation]);

    const saveNoteAndReview = async () => {
        try {
            const data = JSON.stringify({ note, review });
            await AsyncStorage.setItem(noteKey, data);
            setSavedNote(note);
            setSavedReview(review);
            setModalVisible(false);
            Alert.alert('Opgeslagen', 'Je notitie en review zijn opgeslagen.');
        } catch (error) {
            Alert.alert('Fout', 'Kon de gegevens niet opslaan.');
            console.error('Fout bij opslaan van notitie:', error);
        }
    };

    const deleteNoteAndReview = () => {
        Alert.alert(
            "Gegevens Verwijderen",
            "Weet je zeker dat je je notitie en review wilt verwijderen?",
            [
                { text: "Annuleren", style: "cancel" },
                {
                    text: "Verwijder", style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.removeItem(noteKey);
                        loadData();
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            const newUri = result.assets[0].uri;
            const newImages = [...userImages, newUri];
            setUserImages(newImages);
            await AsyncStorage.setItem(userImagesKey, JSON.stringify(newImages));
        }
    };

    const deleteImage = (uriToDelete) => {
        Alert.alert("Foto Verwijderen", "Weet je zeker dat je deze foto wilt verwijderen?", [
            { text: "Annuleren", style: "cancel" },
            { text: "Verwijder", style: "destructive", onPress: async () => {
                    const newImages = userImages.filter(uri => uri !== uriToDelete);
                    setUserImages(newImages);
                    await AsyncStorage.setItem(userImagesKey, JSON.stringify(newImages));
                }}
        ]);
    };

    const shareHotspot = async () => {
        try {
            let message = `Bekijk deze leuke vintage winkel: ${item.naam}!\nAdres: ${item.adres}`;
            if (savedNote) message += `\n\nMijn notitie: ${savedNote}`;
            if (savedReview) message += `\nReview: ${savedReview}`;

            await Share.share({ message });
        } catch (error) {
            Alert.alert(error.message);
        }
    };

    const allImages = [...(item.image_urls || []), ...userImages];

    return (
        <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
            <View style={styles.carouselContainer}>
                {allImages.length > 0 ? (
                    <>
                        <Carousel
                            loop={false}
                            width={screenWidth}
                            height={250}
                            data={allImages}
                            renderItem={({ item: imageUrl }) => <Image source={{ uri: imageUrl }} style={styles.image} />}
                            onSnapToItem={(index) => setCarouselIndex(index)}
                        />
                        <View style={styles.paginationContainer}>
                            {allImages.map((_, index) => (
                                <View key={index} style={[styles.paginationDot, carouselIndex === index && styles.paginationDotActive]} />
                            ))}
                        </View>
                    </>
                ) : (
                    <View style={styles.noImageContainer}>
                        <Text style={styles.noImageText}>Geen afbeeldingen beschikbaar</Text>
                    </View>
                )}
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
                    <TouchableOpacity style={[styles.button, isDarkMode && styles.darkButton]} onPress={() => navigation.navigate('LiveLocation', { hotspot: item })}>
                        <Ionicons name="map-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Bekijk op Kaart</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, isDarkMode && styles.darkButton]} onPress={pickImage}>
                        <Ionicons name="camera-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Foto Toevoegen</Text>
                    </TouchableOpacity>
                </View>

                {userImages.length > 0 && (
                    <View style={styles.userImagesSection}>
                        <Text style={[styles.subTitle, isDarkMode && styles.darkText]}>Mijn Foto's</Text>
                        <FlatList
                            horizontal
                            data={userImages}
                            keyExtractor={(imgUri, index) => `${imgUri}_${index}`}
                            renderItem={({ item: imgUri }) => (
                                <View style={styles.userImageContainer}>
                                    <Image source={{ uri: imgUri }} style={styles.userImage} />
                                    <TouchableOpacity style={styles.deleteImageIcon} onPress={() => deleteImage(imgUri)}>
                                        <Ionicons name="close-circle" size={24} color="#ff4d4d" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            showsHorizontalScrollIndicator={false}
                        />
                    </View>
                )}

                {savedNote || savedReview ? (
                    <View style={[styles.savedNoteBox, isDarkMode && styles.darkSubBox]}>
                        <View style={styles.noteHeader}>
                            <Text style={[styles.subTitle, isDarkMode && styles.darkText, { marginTop: 0 }]}>Mijn Gegevens</Text>
                            <View style={styles.noteActions}>
                                <TouchableOpacity onPress={shareHotspot}><Ionicons name="share-social-outline" size={24} color={isDarkMode ? '#fff' : '#333'} /></TouchableOpacity>
                                <TouchableOpacity onPress={() => setModalVisible(true)}><Ionicons name="pencil-outline" size={24} color={isDarkMode ? '#fff' : '#333'} style={{ marginHorizontal: 15 }} /></TouchableOpacity>
                                <TouchableOpacity onPress={deleteNoteAndReview}><Ionicons name="trash-outline" size={24} color="#ff4d4d" /></TouchableOpacity>
                            </View>
                        </View>
                        {!!savedNote && <><Text style={[styles.subSubTitle, isDarkMode && styles.darkText]}>Notitie:</Text><Text style={[styles.savedText, isDarkMode && styles.darkText]}>{savedNote}</Text></>}
                        {!!savedReview && <><Text style={[styles.subSubTitle, isDarkMode && styles.darkText]}>Review:</Text><Text style={[styles.savedText, isDarkMode && styles.darkText]}>{savedReview}</Text></>}
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.button, styles.addNoteButton, isDarkMode && styles.darkButton]} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Notitie Toevoegen</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
                        <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>Notitie en Review</Text>
                        <TextInput placeholder="Typ hier je notitie..." placeholderTextColor={isDarkMode ? '#888' : '#999'} value={note} onChangeText={setNote} multiline style={[styles.input, isDarkMode && styles.darkInput]}/>
                        <TextInput placeholder="Geef een review..." placeholderTextColor={isDarkMode ? '#888' : '#999'} value={review} onChangeText={setReview} multiline style={[styles.input, isDarkMode && styles.darkInput]}/>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { borderColor: isDarkMode ? '#555' : '#ccc' }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Ionicons name="close-circle-outline" size={22} color={isDarkMode ? '#ccc' : '#555'} />
                                <Text style={[styles.cancelButtonText, { color: isDarkMode ? '#ccc' : '#555' }]}>Annuleren</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveNoteAndReview}>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                                <Text style={styles.modalButtonText}>Opslaan</Text>
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
        height: 250,
        backgroundColor: '#e0e0e0',
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 250,
    },
    noImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageText: {
        color: '#666',
        fontSize: 16,
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
        marginBottom: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e90ff',
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 8,
    },
    addNoteButton: {
        backgroundColor: '#28a745',
    },
    darkButton: {
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#555',
    },
    userImagesSection: {
        marginTop: 20,
    },
    userImageContainer: {
        marginRight: 10,
        position: 'relative',
    },
    userImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    deleteImageIcon: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    savedNoteBox: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
    },
    darkSubBox: {
        backgroundColor: '#2a2a2a',
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    noteActions: {
        flexDirection: 'row',
    },
    subSubTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        color: '#555',
    },
    savedText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
        fontStyle: 'italic',
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
        marginTop: 20,
    },
    modalButton: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    saveButton: {
        backgroundColor: '#28a745',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    cancelButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
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
    darkModalTitle: {
        color: '#fff',
    },
});