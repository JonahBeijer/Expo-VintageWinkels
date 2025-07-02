import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from "./components/HomeScreen";
import Map from "./components/Map";
import DetailScreen from "./components/DetailScreen";
import SettingsScreen from "./components/SettingsScreen";

import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from "react-native-vector-icons/Feather";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


function TabNavigator({ darkMode, toggleDarkMode }) {
    const headerStyle = {
        backgroundColor: darkMode ? '#121212' : '#fff',
        borderBottomColor: darkMode ? '#ffffff' : '#d1d1d1',
        borderBottomWidth: 0.5,

    };
    const headerTintColor = darkMode ? '#fff' : '#000';
    const tabBarStyle = {
        backgroundColor: darkMode ? '#121212' : '#fff',
    };
    const tabBarActiveTintColor = darkMode ? '#fff' : '#000';
    const tabBarInactiveTintColor = darkMode ? '#ccc' : '#777';

    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: headerStyle,
                headerTintColor: headerTintColor,
                tabBarStyle: tabBarStyle,
                tabBarActiveTintColor: tabBarActiveTintColor,
                tabBarInactiveTintColor: tabBarInactiveTintColor,
            }}
        >
            <Tab.Screen
                name="Home"
                options={{
                    title: 'Vintage Winkels',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            >
                {(props) => <HomeScreen {...props} darkMode={darkMode} />}
            </Tab.Screen>
            <Tab.Screen
                name="Map"
                options={{
                    title: 'Kaart',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="map" size={size} color={color} />
                    ),
                }}
            >
                {(props) => <Map {...props} darkMode={darkMode} />}
            </Tab.Screen>
            <Tab.Screen
                name="Settings"
                options={{
                    title: 'Instellingen',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="settings" size={size} color={color} />
                    ),
                }}
            >
                {(props) => (
                    <SettingsScreen
                        {...props}
                        darkMode={darkMode}
                        toggleDarkMode={toggleDarkMode}
                    />
                )}
            </Tab.Screen>
        </Tab.Navigator>
    );
}


export default function App() {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const loadDarkMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem('darkMode');
                if (savedMode !== null) {
                    setDarkMode(JSON.parse(savedMode));
                }
            } catch (error) {
                console.error("Kon dark mode niet laden:", error);
            }
        };
        loadDarkMode();
    }, []);

    const toggleDarkMode = async () => {
        try {
            const newDarkMode = !darkMode;
            setDarkMode(newDarkMode);
            await AsyncStorage.setItem('darkMode', JSON.stringify(newDarkMode));
        } catch (error) {
            console.error("Kon dark mode niet opslaan:", error);
        }
    };

    const stackHeaderStyle = {
        backgroundColor: darkMode ? '#121212' : '#fff',
    };
    const stackHeaderTintColor = darkMode ? '#fff' : '#000';

    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Root"
                    options={{ headerShown: false }}
                >
                    {(props) => (
                        <TabNavigator
                            {...props}
                            darkMode={darkMode}
                            toggleDarkMode={toggleDarkMode}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen
                    name="Detail"
                    component={DetailScreen}
                    options={{
                        title: 'Details',
                        headerStyle: stackHeaderStyle,
                        headerBackTitle: 'Terug',
                        headerTintColor: stackHeaderTintColor,
                    }}
                />
                <Stack.Screen
                    name="LiveLocation"
                    component={Map}
                    options={{
                        title: 'Kaart',
                        headerStyle: stackHeaderStyle,
                        headerTintColor: stackHeaderTintColor,
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}