import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

export default function SettingsScreen({ darkMode, toggleDarkMode }) {
    return (
        <View style={[styles.container, darkMode && styles.darkContainer]}>
            <Text style={[styles.text, darkMode && styles.darkText]}>Dark Mode</Text>
            <Switch
                trackColor={{ false: "#767577", true: "#ffffff" }}
                thumbColor={darkMode ? "#767577" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleDarkMode}
                value={darkMode}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        margin: '10px'
    },
    darkContainer: {
        backgroundColor: '#121212',
    },
    text: {
        fontSize: 18,
        color: '#000',
    },
    darkText: {
        color: '#fff',
    },
});